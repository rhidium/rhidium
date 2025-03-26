import { UnitConstants } from '@client/constants';
import { Queue } from '.';

export type QueueCallbackFunction<T> = (item: T) => Promise<void> | void;

export interface QueueManagerOptions<T> {
  /**
   * The function to run on each item in the queue, before
   * continuing to the next item
   */
  processFunction?: QueueCallbackFunction<T> | undefined;
  /**
   * The maximum number of items that can be stored in the queue
   */
  maxQueueSize?: number;
  /**
   * Should we skip processing the first item in the queue when it's full and an item is added?
   */
  skipProcessOnFull?: boolean;
  /**
   * The amount of time in ms to wait before retrieving the next item in the queue
   */
  nextDelay?: number;
  /**
   * The amount of time to wait before resuming once the queue is empty
   */
  waitOnEmpty?: number;
  /**
   * Should we stop processing once the queue is empty, or wait for more items to be added?
   */
  stopOnEmpty?: boolean;
  /**
   * Callback to run when an item is about to be processed
   */
  onProcessStart?: QueueCallbackFunction<T>;
  /**
   * Callback to run when an item is processed
   */
  onProcessEnd?: QueueCallbackFunction<T>;
  /**
   * Callback to run when an item is added to the queue
   */
  onAdd?: QueueCallbackFunction<T>;
  /**
   * Callback to run when an item is removed from the queue
   */
  onRemove?: QueueCallbackFunction<T>;
  /**
   * Callback to run when the queue is cleared
   */
  onClear?: () => Promise<void> | void;
  /**
   * Callback to run when the queue is empty
   */
  onEmpty?: () => Promise<void> | void;
}

export class QueueManager<T> implements QueueManagerOptions<T> {
  private queue: Queue<T>;
  maxQueueSize: number;
  next = () => this.queue.dequeue();
  nextDelay: number;
  skipProcessOnFull: boolean;
  waitOnEmpty: number;
  stopOnEmpty = false;
  resumeOnEmptyTimeout: NodeJS.Timeout | undefined;
  processInterval: NodeJS.Timeout | undefined;
  processFunction?: QueueCallbackFunction<T> | undefined;
  onProcessStart?: QueueCallbackFunction<T>;
  onProcessEnd?: QueueCallbackFunction<T>;
  onAdd?: QueueCallbackFunction<T>;
  onRemove?: QueueCallbackFunction<T>;
  onClear?: () => void | Promise<void>;
  onEmpty?: () => void | Promise<void>;
  itemsProcessed = 0;
  itemsAdded = 0;
  itemsRemoved = 0;
  itemsProcessedPerSecond = 0;
  itemsAddedPerSecond = 0;
  itemsRemovedPerSecond = 0;
  averageProcessTime = 0;
  lowestProcessTime = 0;
  highestProcessTime = 0;

  static readonly default = {
    maxQueueSize: Infinity,
    skipProcessOnFull: false,
    nextDelay: 0,
    waitOnEmpty: 125,
  };

  constructor(
    options: QueueManagerOptions<T> | QueueCallbackFunction<T>,
    queue: T[] = [],
  ) {
    const resolvedOptions =
      typeof options === 'function' ? { processFunction: options } : options;
    this.queue = new Queue<T>(queue);
    this.skipProcessOnFull =
      resolvedOptions.skipProcessOnFull ??
      QueueManager.default.skipProcessOnFull;
    this.maxQueueSize =
      resolvedOptions.maxQueueSize ?? QueueManager.default.maxQueueSize;
    this.nextDelay =
      resolvedOptions.nextDelay ?? QueueManager.default.nextDelay;
    this.waitOnEmpty =
      resolvedOptions.waitOnEmpty ?? QueueManager.default.waitOnEmpty;
    this.processFunction = resolvedOptions.processFunction;
    if (resolvedOptions.onProcessStart)
      this.onProcessStart = resolvedOptions.onProcessStart;
    if (resolvedOptions.onProcessEnd)
      this.onProcessEnd = resolvedOptions.onProcessEnd;
    if (resolvedOptions.onAdd) this.onAdd = resolvedOptions.onAdd;
    if (resolvedOptions.onRemove) this.onRemove = resolvedOptions.onRemove;
    if (resolvedOptions.onClear) this.onClear = resolvedOptions.onClear;
    if (resolvedOptions.onEmpty) this.onEmpty = resolvedOptions.onEmpty;
  }

  private async processItem(item: T | undefined) {
    if (item === undefined) return;
    if (this.onProcessStart) await this.onProcessStart(item);
    if (this.processFunction) await this.processFunction(item);
    if (this.onProcessEnd) await this.onProcessEnd(item);
  }

  /**
   * Starts processing the queue, never initialized internally so
   * requires explicit call to start, static queue if never called
   */
  process() {
    return new Promise<T | undefined>((resolve) => {
      const interval = setInterval(async () => {
        const nextItem = this.next();
        if (nextItem === undefined) {
          clearInterval(interval);
          if (this.onEmpty) await this.onEmpty();
          if (!this.stopOnEmpty) return resolve(undefined);
          const resumeOnEmptyTimeout = setTimeout(() => {
            void this.process();
          }, this.waitOnEmpty);
          this.resumeOnEmptyTimeout = resumeOnEmptyTimeout;
          return resolve(undefined);
        }

        const start = process.hrtime();
        await this.processItem(nextItem);
        const end = process.hrtime(start);

        resolve(nextItem);

        const processTime =
          end[0] * UnitConstants.MS_IN_ONE_SECOND +
          end[1] / UnitConstants.NS_IN_ONE_MS;
        this.itemsProcessed++;
        this.itemsProcessedPerSecond =
          this.itemsProcessed / (Date.now() / UnitConstants.MS_IN_ONE_SECOND);
        this.averageProcessTime = (this.averageProcessTime + processTime) / 2;
        this.lowestProcessTime = Math.min(this.lowestProcessTime, processTime);
        this.highestProcessTime = Math.max(
          this.highestProcessTime,
          processTime,
        );
      }, this.nextDelay);
      this.processInterval = interval;
    });
  }

  /**
   * Adds an item to the queue
   */
  add(item: T) {
    this.itemsAdded++;
    this.itemsAddedPerSecond =
      this.itemsAdded / (Date.now() / UnitConstants.MS_IN_ONE_SECOND);
    if (this.queue.length === this.maxQueueSize) {
      const first = this.next();
      if (first && !this.skipProcessOnFull && this.processFunction) {
        void this.processItem(first);
      }
    }
    if (this.onAdd) {
      void this.onAdd(item);
    }
    this.queue.enqueue(item);
  }

  /**
   * Removes an item from the queue
   */
  remove(item: T) {
    this.itemsRemoved++;
    this.itemsRemovedPerSecond =
      this.itemsRemoved / (Date.now() / UnitConstants.MS_IN_ONE_SECOND);
    const removed = this.queue.remove(item);
    if (removed && this.onRemove) void this.onRemove(item);
    return removed;
  }

  /**
   * Clears the queue
   */
  async clear() {
    this.queue.clear();
    if (this.onClear) await this.onClear();
  }

  /**
   * Retrieves the first item in the queue without removing it
   * @returns The first item in the queue
   */
  peek() {
    return this.queue.peek();
  }
}
