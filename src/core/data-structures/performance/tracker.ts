import { TimeUtils } from '@core/utils';

type AnyFunction = (...args: unknown[]) => unknown;

export type PerformanceTrackerMetrics = {
  totalRuns: number;
  totalTime: number;
  averageTime: number;
  longestTime: number;
  shortestTime: number;
};

export type PerformanceTrackerCallbacks<T> = {
  onStart?: (arg: { name: string; startTs: number }) => void;
  onEnd?: (arg: {
    name: string;
    result: T;
    duration: number;
    metrics: PerformanceTrackerMetrics;
  }) => void;
};

/**
 * A simple tracker to measure the performance of a function/operation.
 *
 * Please note that this tracker does not handle runtime errors.
 *
 * @example
 * ```ts
 * async function fetchData() {
 *   return new Promise<string>((resolve) =>
 *     setTimeout(() => resolve('data'), 500),
 *   );
 * }
 *
 * const fetchWithTracker = new PerformanceTracker(fetchData, {
 *   name: 'fetchData', // Optional, defaults to function name
 *   onStart: ({ name }) => Logger.debug(`${name} - Operation started`),
 *   onEnd: ({ name, result, duration, metrics }) => {
 *     Logger.debug(`${name} Operation completed in ${duration}ms`, {
 *       result,
 *       metrics,
 *     });
 *   },
 * });
 *
 * setInterval(() => {
 *   void fetchWithTracker.run();
 * }, 1500);
 * ```
 */
export class PerformanceTracker<T> {
  public metrics: PerformanceTrackerMetrics = {
    totalRuns: 0,
    totalTime: 0,
    averageTime: 0,
    longestTime: 0,
    shortestTime: Number.POSITIVE_INFINITY,
  };

  private readonly name: string;
  private readonly callbacks: PerformanceTrackerCallbacks<T>;

  constructor(
    private fn: () => T | Promise<T>,
    readonly options?: {
      name?: string;
    } & {
      [K in keyof PerformanceTrackerCallbacks<T>]?: PerformanceTrackerCallbacks<T>[K];
    },
  ) {
    this.callbacks = {
      onStart: options?.onStart,
      onEnd: options?.onEnd,
    };
    this.name = options?.name ?? fn.name;
  }

  public async run<O extends AnyFunction>(
    /**
     * Any function can be run instead of the one provided in the constructor.
     */
    fn: O = this.fn as O,
    /**
     * Optional name (override) for the operation.
     */
    name?: string,
  ): Promise<ReturnType<typeof fn>> {
    const nowTs = Date.now();
    const start = process.hrtime();
    const resolvedFn = fn ?? this.fn;
    const resolvedName = fn ? (name ?? fn.name) : this.name;

    this.callbacks?.onStart?.({
      name: resolvedName,
      startTs: nowTs,
    });

    const result = (await resolvedFn()) as ReturnType<O>;
    const end = process.hrtime(start);
    const duration = TimeUtils.hrTimeToMs(end);

    this.metrics.totalRuns++;
    this.metrics.totalTime += duration;
    this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalRuns;
    this.metrics.longestTime = Math.max(this.metrics.longestTime, duration);
    this.metrics.shortestTime = Math.min(this.metrics.shortestTime, duration);

    this.callbacks?.onEnd?.({
      name: resolvedName,
      result: result as T,
      duration,
      metrics: this.metrics,
    });

    return result;
  }
}

export class PerformanceTrackerManager<T> {
  constructor(
    private trackers: Map<string, PerformanceTracker<T>> = new Map(),
  ) {}

  get(name: string): PerformanceTracker<T> | undefined {
    return this.trackers.get(name) as PerformanceTracker<T> | undefined;
  }

  set(name: string, tracker: PerformanceTracker<T>): void {
    this.trackers.set(name, tracker);
  }

  delete(name: string): boolean {
    return this.trackers.delete(name);
  }

  clear(): void {
    this.trackers.clear();
  }
}
