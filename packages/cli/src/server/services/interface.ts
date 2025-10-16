export interface ServerService {
  readonly name: string;

  start(): void | Promise<void>;

  stop(): void | Promise<void>;
}
