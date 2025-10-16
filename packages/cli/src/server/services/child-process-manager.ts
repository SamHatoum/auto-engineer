import kill from 'tree-kill';
import createDebug from 'debug';
import type { ServerService } from './interface';
import type { MessageBus, Event, EventSubscription } from '@auto-engineer/message-bus';

const debug = createDebug('auto:cli:child-process-manager');

export interface ProcessInfo {
  pid: number;
  type: string;
  directory: string;
  startedAt: Date;
}

export class ChildProcessManager implements ServerService {
  readonly name = 'ChildProcessManager';

  private readonly messageBus: MessageBus;
  private readonly processes = new Map<number, ProcessInfo>();
  private readonly shutdownTimeoutMs: number;
  private subscription: EventSubscription | null = null;

  constructor(messageBus: MessageBus, shutdownTimeoutMs = 5000) {
    this.messageBus = messageBus;
    this.shutdownTimeoutMs = shutdownTimeoutMs;
  }

  start(): void {
    debug('Starting %s service', this.name);

    this.subscription = this.messageBus.subscribeAll({
      name: this.name,
      handle: async (event: Event) => {
        if (event.data?.pid !== undefined && event.data.pid !== null && typeof event.data.pid === 'number') {
          this.register(event.data.pid, {
            type: event.type,
            directory: this.extractDirectory(event.data),
          });
        }
      },
    });

    debug('%s service started', this.name);
  }

  async stop(): Promise<void> {
    debug('Stopping %s service', this.name);

    await this.killAll();

    if (this.subscription !== null) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    debug('%s service stopped', this.name);
  }

  private extractDirectory(data: Record<string, unknown>): string {
    return (
      (data.serverDirectory as string) || (data.clientDirectory as string) || (data.directory as string) || 'unknown'
    );
  }

  private register(pid: number, info: Omit<ProcessInfo, 'pid' | 'startedAt'>): void {
    const processInfo: ProcessInfo = {
      pid,
      ...info,
      startedAt: new Date(),
    };

    this.processes.set(pid, processInfo);
    debug('Registered process %d (%s) in %s', pid, info.type, info.directory);
  }

  private unregister(pid: number): void {
    if (this.processes.delete(pid)) {
      debug('Unregistered process %d', pid);
    }
  }

  getAll(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }

  has(pid: number): boolean {
    return this.processes.has(pid);
  }

  private async kill(pid: number): Promise<void> {
    const processInfo = this.processes.get(pid);
    if (processInfo === undefined) {
      debug('Process %d not found in registry', pid);
      return;
    }

    debug('Killing process %d (%s)', pid, processInfo.type);

    try {
      await this.killProcessWithTimeout(pid);
      this.unregister(pid);
      debug('Successfully killed process %d', pid);
    } catch (error) {
      debug('Failed to kill process %d: %O', pid, error);
      this.unregister(pid);
    }
  }

  private async killAll(): Promise<void> {
    if (this.processes.size === 0) {
      debug('No processes to kill');
      return;
    }

    debug('Killing all %d processes', this.processes.size);

    const pids = Array.from(this.processes.keys());
    const killPromises = pids.map((pid) => this.kill(pid));

    await Promise.allSettled(killPromises);

    debug('All processes killed');
  }

  private async killProcessWithTimeout(pid: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let terminated = false;

      const timeoutId = setTimeout(() => {
        if (!terminated) {
          terminated = true;
          debug('Process %d did not terminate after SIGTERM, sending SIGKILL', pid);
          kill(pid, 'SIGKILL', (error) => {
            if (error !== undefined && error !== null) {
              debug('SIGKILL failed for process %d: %O', pid, error);
            }
            resolve();
          });
        }
      }, this.shutdownTimeoutMs);

      kill(pid, 'SIGTERM', (error) => {
        if (!terminated) {
          terminated = true;
          clearTimeout(timeoutId);

          if (error !== undefined && error !== null) {
            debug('SIGTERM failed for process %d, trying SIGKILL: %O', pid, error);
            kill(pid, 'SIGKILL', (killError) => {
              if (killError !== undefined && killError !== null) {
                debug('SIGKILL also failed for process %d: %O', pid, killError);
                reject(killError);
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        }
      });
    });
  }
}
