import type {
  Message,
  PositionalMessage,
  MessageFilter,
  StreamInfo,
  SessionInfo,
  MessageStoreStats,
  MessageType,
} from './types';

export interface IMessageStore {
  /**
   * Save messages to a specific stream
   */
  saveMessages(
    streamId: string,
    messages: Message[],
    expectedRevision?: bigint,
    messageType?: MessageType,
  ): Promise<void>;

  /**
   * Save a single message to a stream
   */
  saveMessage(streamId: string, message: Message, expectedRevision?: bigint, messageType?: MessageType): Promise<void>;

  /**
   * Get messages from a specific stream
   */
  getMessages(streamId: string, fromRevision?: bigint, count?: number): Promise<PositionalMessage[]>;

  /**
   * Get all messages across all streams with optional filtering
   */
  getAllMessages(filter?: MessageFilter, count?: number): Promise<PositionalMessage[]>;

  /**
   * Get all commands across all streams
   */
  getAllCommands(filter?: Omit<MessageFilter, 'messageType'>, count?: number): Promise<PositionalMessage[]>;

  /**
   * Get all events across all streams
   */
  getAllEvents(filter?: Omit<MessageFilter, 'messageType'>, count?: number): Promise<PositionalMessage[]>;

  /**
   * Get information about a specific stream
   */
  getStreamInfo(streamId: string): Promise<StreamInfo | null>;

  /**
   * Get all stream IDs
   */
  getStreams(): Promise<string[]>;

  /**
   * Get information about all sessions
   */
  getSessions(): Promise<SessionInfo[]>;

  /**
   * Get information about a specific session
   */
  getSessionInfo(sessionId: string): Promise<SessionInfo | null>;

  /**
   * Get messages for a specific session
   */
  getSessionMessages(
    sessionId: string,
    filter?: Omit<MessageFilter, 'sessionId'>,
    count?: number,
  ): Promise<PositionalMessage[]>;

  /**
   * Get storage statistics
   */
  getStats(): Promise<MessageStoreStats>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;
}

export interface ILocalMessageStore extends IMessageStore {
  /**
   * Reset/clear all stored messages
   */
  reset(): Promise<void>;

  /**
   * Create a new session and return the session ID
   */
  createSession(): Promise<string>;

  /**
   * Mark a session as ended
   */
  endSession(sessionId: string): Promise<void>;
}
