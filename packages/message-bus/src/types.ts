export interface BaseCommand {
  type: string;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
}

export interface BaseEvent {
  type: string;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
}

export interface BaseQuery {
  type: string;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
}

export interface BaseResult {
  type: string;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
}

export interface AckResponse {
  status: 'ack';
  message?: string;
  timestamp: Date;
  requestId?: string;
}

export interface NackResponse {
  status: 'nack';
  error: string;
  timestamp: Date;
  requestId?: string;
}

export type AckNackResponse = AckResponse | NackResponse;

export interface CommandHandler<
  TCommand extends BaseCommand = BaseCommand
> {
  name: string;
  handle: (command: TCommand) => Promise<AckNackResponse>;
}

export interface EventHandler<
  TEvent extends BaseEvent = BaseEvent
> {
  name: string;
  handle: (event: TEvent) => Promise<AckNackResponse>;
}

export interface QueryHandler<
  TQuery extends BaseQuery = BaseQuery,
  TResult extends BaseResult = BaseResult
> {
  name: string;
  handle: (query: TQuery) => Promise<TResult>;
} 