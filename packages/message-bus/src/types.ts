export type BaseCommand = {
  type: string;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
};

export type BaseEvent = {
  type: string;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
};

export type BaseQuery = {
  type: string;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
};

export type BaseResult = {
  type: string;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
};

export type AckResponse = {
  status: 'ack';
  message?: string;
  timestamp: Date;
  requestId?: string;
};

export type NackResponse = {
  status: 'nack';
  error: string;
  timestamp: Date;
  requestId?: string;
};

export type AckNackResponse = AckResponse | NackResponse;

export type CommandHandler<
  TCommand extends BaseCommand = BaseCommand
> = {
  name: string;
  handle: (command: TCommand) => Promise<AckNackResponse>;
};

export type EventHandler<
  TEvent extends BaseEvent = BaseEvent
> = {
  name: string;
  handle: (event: TEvent) => Promise<AckNackResponse>;
};

export type QueryHandler<
  TQuery extends BaseQuery = BaseQuery,
  TResult extends BaseResult = BaseResult
> = {
  name: string;
  handle: (query: TQuery) => Promise<TResult>;
}; 