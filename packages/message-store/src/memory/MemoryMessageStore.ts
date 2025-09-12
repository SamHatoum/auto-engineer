import { nanoid } from 'nanoid';
import type {
  Message,
  PositionalMessage,
  MessageFilter,
  StreamInfo,
  SessionInfo,
  MessageStoreStats,
  MessageType,
} from '../interfaces/types';
import type { ILocalMessageStore } from '../interfaces/IMessageStore';
import createDebug from 'debug';

const debug = createDebug('message-store:memory');

interface StreamData {
  messages: PositionalMessage[];
  revision: bigint;
  createdAt: Date;
  lastUpdated: Date;
}

export class MemoryMessageStore implements ILocalMessageStore {
  private streams: Map<string, StreamData> = new Map();
  private globalPosition = BigInt(0);
  private sessions: Map<string, SessionInfo> = new Map();
  private currentSessionId: string | null = null;

  constructor() {
    debug('MemoryMessageStore initialized.');
  }

  async createSession(): Promise<string> {
    const sessionId = `session-${Date.now()}-${nanoid(8)}`;
    const sessionInfo: SessionInfo = {
      sessionId,
      startedAt: new Date(),
      messageCount: 0,
      commandCount: 0,
      eventCount: 0,
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, sessionInfo);
    this.currentSessionId = sessionId;

    // Create a dedicated stream for this session
    const sessionStreamId = `session-${sessionId}`;
    this.streams.set(sessionStreamId, {
      messages: [],
      revision: BigInt(-1),
      createdAt: new Date(),
      lastUpdated: new Date(),
    });

    debug('Created new session: %s', sessionId);
    return sessionId;
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }

    debug('Ended session: %s', sessionId);
  }

  async saveMessage(
    streamId: string,
    message: Message,
    expectedRevision?: bigint,
    messageType?: MessageType,
  ): Promise<void> {
    return this.saveMessages(streamId, [message], expectedRevision, messageType);
  }

  // eslint-disable-next-line complexity
  async saveMessages(
    streamId: string,
    messages: Message[],
    expectedRevision?: bigint,
    messageType?: MessageType,
  ): Promise<void> {
    debug('Saving %d messages to stream: %s', messages.length, streamId);

    // Get or create stream
    let streamData = this.streams.get(streamId);
    if (!streamData) {
      if (expectedRevision !== undefined && expectedRevision !== BigInt(-1)) {
        throw new Error(`Stream ${streamId} does not exist, but expected revision ${expectedRevision} was provided`);
      }

      streamData = {
        messages: [],
        revision: BigInt(-1),
        createdAt: new Date(),
        lastUpdated: new Date(),
      };
      this.streams.set(streamId, streamData);
    }

    // Check expected revision
    if (expectedRevision !== undefined && streamData.revision !== expectedRevision) {
      throw new Error(`Expected revision ${expectedRevision} but stream is at revision ${streamData.revision}`);
    }

    const now = new Date();
    const sessionId = this.currentSessionId ?? 'no-session';

    // Convert and store messages
    for (const message of messages) {
      this.globalPosition++;
      streamData.revision++;

      // Determine message type from context or stream name
      const detectedMessageType: MessageType =
        messageType ||
        (streamId.includes('command')
          ? 'command'
          : streamId.includes('event')
            ? 'event'
            : // Try to infer from the message structure - commands typically have requestId
              message.requestId !== undefined && message.requestId !== null && message.requestId !== ''
              ? 'command'
              : 'event');

      const positionalMessage: PositionalMessage = {
        streamId,
        message: {
          ...message,
          timestamp: message.timestamp || now,
        },
        messageType: detectedMessageType,
        revision: streamData.revision,
        position: this.globalPosition,
        timestamp: now,
        sessionId,
      };

      streamData.messages.push(positionalMessage);
      streamData.lastUpdated = now;

      // Update session stats
      const session = this.sessions.get(sessionId);
      if (session) {
        session.messageCount++;
        session.lastActivity = now;
        if (detectedMessageType === 'command') {
          session.commandCount++;
        } else {
          session.eventCount++;
        }
      }

      // Note: Removed automatic session stream duplication to avoid message duplicates
      // Session information is tracked via sessionId field in the message itself
    }

    debug(
      'Saved %d messages to stream %s, new revision: %s',
      messages.length,
      streamId,
      streamData.revision.toString(),
    );
  }

  async getMessages(streamId: string, fromRevision?: bigint, count?: number): Promise<PositionalMessage[]> {
    const streamData = this.streams.get(streamId);
    if (!streamData) {
      return [];
    }

    let messages = streamData.messages;

    if (fromRevision !== undefined && fromRevision !== null) {
      messages = messages.filter((m) => m.revision >= fromRevision);
    }

    if (count !== undefined && count !== null && !isNaN(count) && count > 0) {
      messages = messages.slice(-count); // Get the most recent N messages
    }

    return [...messages];
  }

  async getAllMessages(filter?: MessageFilter, count?: number): Promise<PositionalMessage[]> {
    const allMessages: PositionalMessage[] = [];

    for (const streamData of this.streams.values()) {
      allMessages.push(...streamData.messages);
    }

    // Sort by position
    allMessages.sort((a, b) => Number(a.position) - Number(b.position));

    let filtered = this.applyFilter(allMessages, filter);

    if (count !== undefined && count !== null && !isNaN(count) && count > 0) {
      filtered = filtered.slice(-count); // Get the most recent N messages
    }

    return filtered;
  }

  async getAllCommands(filter?: Omit<MessageFilter, 'messageType'>, count?: number): Promise<PositionalMessage[]> {
    return this.getAllMessages({ ...filter, messageType: 'command' }, count);
  }

  async getAllEvents(filter?: Omit<MessageFilter, 'messageType'>, count?: number): Promise<PositionalMessage[]> {
    return this.getAllMessages({ ...filter, messageType: 'event' }, count);
  }

  private applyFilter(messages: PositionalMessage[], filter?: MessageFilter): PositionalMessage[] {
    if (filter === undefined || filter === null) {
      return messages;
    }

    return messages.filter((message) => this.messageMatchesFilter(message, filter));
  }

  private messageMatchesFilter(message: PositionalMessage, filter: MessageFilter): boolean {
    return (
      this.passesTypeFilter(message, filter) &&
      this.passesIdentifierFilters(message, filter) &&
      this.passesPositionFilters(message, filter) &&
      this.passesTimestampFilters(message, filter) &&
      this.passesJsonFilter(message, filter)
    );
  }

  private passesTypeFilter(message: PositionalMessage, filter: MessageFilter): boolean {
    // Message type filter
    if (filter.messageType !== undefined && filter.messageType !== null && message.messageType !== filter.messageType) {
      return false;
    }

    // Message names filter
    if (
      filter.messageNames !== undefined &&
      filter.messageNames !== null &&
      filter.messageNames.length > 0 &&
      !filter.messageNames.includes(message.message.type)
    ) {
      return false;
    }

    return true;
  }

  // eslint-disable-next-line complexity
  private passesIdentifierFilters(message: PositionalMessage, filter: MessageFilter): boolean {
    // Stream ID filter
    if (
      filter.streamId !== undefined &&
      filter.streamId !== null &&
      filter.streamId !== '' &&
      message.streamId !== filter.streamId
    ) {
      return false;
    }

    // Session ID filter
    if (
      filter.sessionId !== undefined &&
      filter.sessionId !== null &&
      filter.sessionId !== '' &&
      message.sessionId !== filter.sessionId
    ) {
      return false;
    }

    // Correlation ID filter
    if (
      filter.correlationId !== undefined &&
      filter.correlationId !== null &&
      filter.correlationId !== '' &&
      message.message.correlationId !== filter.correlationId
    ) {
      return false;
    }

    // Request ID filter
    if (
      filter.requestId !== undefined &&
      filter.requestId !== null &&
      filter.requestId !== '' &&
      message.message.requestId !== filter.requestId
    ) {
      return false;
    }

    return true;
  }

  private passesPositionFilters(message: PositionalMessage, filter: MessageFilter): boolean {
    // Position filters
    if (filter.fromPosition !== undefined && filter.fromPosition !== null && message.position < filter.fromPosition) {
      return false;
    }
    if (filter.toPosition !== undefined && filter.toPosition !== null && message.position > filter.toPosition) {
      return false;
    }

    return true;
  }

  private passesTimestampFilters(message: PositionalMessage, filter: MessageFilter): boolean {
    // Timestamp filters
    if (
      filter.fromTimestamp !== undefined &&
      filter.fromTimestamp !== null &&
      message.timestamp < filter.fromTimestamp
    ) {
      return false;
    }
    if (filter.toTimestamp !== undefined && filter.toTimestamp !== null && message.timestamp > filter.toTimestamp) {
      return false;
    }

    return true;
  }

  private passesJsonFilter(message: PositionalMessage, filter: MessageFilter): boolean {
    // JSON filter (simple property matching for now)
    if (filter.jsonFilter !== undefined && filter.jsonFilter !== null) {
      return this.matchesJsonFilter(message.message.data, filter.jsonFilter);
    }

    return true;
  }

  private matchesJsonFilter(data: unknown, jsonFilter: Record<string, unknown>): boolean {
    if (data === undefined || data === null || typeof data !== 'object') {
      return false;
    }

    const dataObj = data as Record<string, unknown>;

    for (const [key, expectedValue] of Object.entries(jsonFilter)) {
      if (dataObj[key] !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  async getStreamInfo(streamId: string): Promise<StreamInfo | null> {
    const streamData = this.streams.get(streamId);
    if (!streamData) {
      return null;
    }

    const messages = streamData.messages;
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    return {
      streamId,
      revision: streamData.revision,
      messageCount: messages.length,
      firstPosition: firstMessage?.position ?? BigInt(0),
      lastPosition: lastMessage?.position ?? BigInt(0),
      createdAt: streamData.createdAt,
      lastUpdated: streamData.lastUpdated,
    };
  }

  async getStreams(): Promise<string[]> {
    return Array.from(this.streams.keys());
  }

  async getSessions(): Promise<SessionInfo[]> {
    return Array.from(this.sessions.values());
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getSessionMessages(
    sessionId: string,
    filter?: Omit<MessageFilter, 'sessionId'>,
    count?: number,
  ): Promise<PositionalMessage[]> {
    const sessionStreamId = `session-${sessionId}`;
    const sessionMessages = await this.getMessages(sessionStreamId, undefined, count);

    if (filter) {
      return this.applyFilter(sessionMessages, { ...filter, sessionId });
    }

    return sessionMessages;
  }

  async getStats(): Promise<MessageStoreStats> {
    let totalMessages = 0;
    let totalCommands = 0;
    let totalEvents = 0;
    let oldestTimestamp: Date | undefined;
    let newestTimestamp: Date | undefined;

    for (const streamData of this.streams.values()) {
      for (const message of streamData.messages) {
        totalMessages++;

        if (message.messageType === 'command') {
          totalCommands++;
        } else {
          totalEvents++;
        }

        if (!oldestTimestamp || message.timestamp < oldestTimestamp) {
          oldestTimestamp = message.timestamp;
        }
        if (!newestTimestamp || message.timestamp > newestTimestamp) {
          newestTimestamp = message.timestamp;
        }
      }
    }

    return {
      totalMessages,
      totalCommands,
      totalEvents,
      totalStreams: this.streams.size,
      totalSessions: this.sessions.size,
      memoryUsage: this.estimateMemoryUsage(),
      oldestMessage: oldestTimestamp,
      newestMessage: newestTimestamp,
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    let size = 0;

    for (const streamData of this.streams.values()) {
      for (const message of streamData.messages) {
        // Convert BigInt fields to strings for JSON serialization
        const serializedMessage = {
          ...message,
          revision: message.revision.toString(),
          position: message.position.toString(),
        };
        size += JSON.stringify(serializedMessage).length * 2; // Rough estimate for UTF-16
      }
    }

    return size;
  }

  async reset(): Promise<void> {
    debug('Resetting message store');
    this.streams.clear();
    this.sessions.clear();
    this.globalPosition = BigInt(0);
    this.currentSessionId = null;
  }

  async dispose(): Promise<void> {
    debug('Disposing message store');
    await this.reset();
  }
}
