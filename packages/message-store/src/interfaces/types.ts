import type { Command, Event } from '@auto-engineer/message-bus';

export type Message = Command | Event;

export type MessageType = 'command' | 'event';

export interface PositionalMessage {
  streamId: string;
  message: Message;
  messageType: MessageType;
  revision: bigint;
  position: bigint;
  timestamp: Date;
  sessionId: string;
}

export interface MessageFilter {
  messageType?: MessageType;
  messageNames?: string[];
  streamId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  fromPosition?: bigint;
  toPosition?: bigint;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  jsonFilter?: Record<string, unknown>; // JSONPath-style filtering on message.data
}

export interface StreamInfo {
  streamId: string;
  revision: bigint;
  messageCount: number;
  firstPosition: bigint;
  lastPosition: bigint;
  createdAt: Date;
  lastUpdated: Date;
}

export interface SessionInfo {
  sessionId: string;
  startedAt: Date;
  messageCount: number;
  commandCount: number;
  eventCount: number;
  lastActivity: Date;
}

export interface MessageStoreStats {
  totalMessages: number;
  totalCommands: number;
  totalEvents: number;
  totalStreams: number;
  totalSessions: number;
  memoryUsage?: number;
  oldestMessage?: Date;
  newestMessage?: Date;
}
