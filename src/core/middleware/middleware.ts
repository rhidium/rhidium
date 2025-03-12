export type MiddlewareContext = object;

export type MiddlewareRunFunction<Context extends MiddlewareContext> = (
  context: RuntimeContext<Context>,
) => Promise<unknown> | unknown;

export type MiddlewareHookCallback<Context extends MiddlewareContext> = (
  context: Context,
) => Promise<unknown> | unknown;

export type MiddlewareHookCallbackWithError<Context extends MiddlewareContext> =
  (error: Error, context: Context) => Promise<unknown> | unknown;

export type CreateMiddleware<Context extends MiddlewareContext> =
  | MiddlewareRunFunction<Context>
  | MiddlewareOptions<Context>;

export const createMiddleware = <Context extends MiddlewareContext>(
  e: CreateMiddleware<Context>,
) =>
  typeof e === 'function'
    ? new Middleware({ execute: e })
    : e instanceof Middleware
      ? e
      : new Middleware(e);

export type MiddlewareOptions<Context extends MiddlewareContext> = {
  disabled?: boolean;
  execute: MiddlewareRunFunction<Context>;
  hooks?: Partial<MiddlewareHooks<Context>>;
};

export interface MiddlewareHooks<Context extends MiddlewareContext> {
  /**
   * Called before the middleware is executed
   */
  before: MiddlewareHookCallback<Context> | null;
  /**
   * Called after the middleware is executed
   */
  after: MiddlewareHookCallback<Context> | null;
  /**
   * Called when the middleware errors
   */
  onError: MiddlewareHookCallbackWithError<Context> | null;
}

export type RuntimeContext<Context extends MiddlewareContext> = {
  /**
   * The return value of the previous middleware execute function
   */
  previousResult: unknown;
  /**
   * The previous middleware - if any
   */
  previousMiddleware: Middleware<Context> | null;
  /**
   * The next middleware
   */
  nextMiddleware: Middleware<Context> | null;
  /**
   * If next is not called in your middleware execute function
   * the next middleware will not be called
   */
  next: () => void;
} & Context;

export class Middleware<Context extends MiddlewareContext> {
  /** Is this middleware disabled? */
  disabled: boolean;
  /** The function to execute when this middleware is called */
  execute: MiddlewareRunFunction<Context>;
  /** Hooks to execute before and after the middleware is executed */
  hooks: MiddlewareHooks<Context>;
  /** The average runtime of this middleware */
  runtimeAverage: number | null = null;
  /** Lowest runtime seen for this middleware */
  runtimeLowest: number | null = null;
  /** Highest runtime seen for this middleware */
  runtimeHighest: number | null = null;
  /** Total runtime of this middleware */
  runtimeTotal = 0;
  /** Variance of runtime for this middleware */
  runtimeVariance: number | null = null;
  /** Standard deviation of runtime for this middleware */
  runtimeStandardDeviation: number | null = null;
  /** The number of times this middleware has been executed */
  executedCount = 0;
  /** The last time this middleware was executed */
  lastExecutedTs: number | null = null;
  /** The last runtime of this middleware in milliseconds */
  lastExecutedRuntime: number | null = null;
  /** The last result of this middleware */
  lastExecutedResult: unknown | null = null;
  static readonly default = {
    disabled: false,
    execute: (): void => {},
    hooks: {
      before: null,
      after: null,
      onError: null,
    },
  };
  constructor(options: MiddlewareOptions<Context>) {
    this.disabled = options.disabled ?? Middleware.default.disabled;
    this.execute = options.execute ?? Middleware.default.execute;
    this.hooks = {
      before: options.hooks?.before ?? Middleware.default.hooks.before,
      after: options.hooks?.after ?? Middleware.default.hooks.after,
      onError: options.hooks?.onError ?? Middleware.default.hooks.onError,
    };
  }

  /**
   * Executes this middleware
   */
  run = async (
    context: RuntimeContext<Context>,
    hookContext: Context,
  ): Promise<unknown> => {
    if (this.hooks.before) {
      await this.hooks.before(hookContext);
    }

    const start = Date.now();
    let result;
    try {
      result = await this.execute(context);
    } catch (err) {
      if (this.hooks.onError) {
        const error = err instanceof Error ? err : new Error(`${err}`);
        await this.hooks.onError(error, hookContext);
      } else throw err;
    }
    const end = Date.now();

    if (this.hooks.after) {
      await this.hooks.after(hookContext);
    }

    const runtime = end - start;
    this.updateRuntimeStatistics(runtime);
    this.lastExecutedTs = Date.now();
    this.lastExecutedRuntime = runtime;
    this.lastExecutedResult = result;

    return result;
  };

  /**
   * Updates the runtime statistics for this middleware
   */
  updateRuntimeStatistics = (runtime: number): void => {
    this.runtimeAverage = this.runtimeTotal / ++this.executedCount;
    if (this.runtimeLowest === null || runtime < this.runtimeLowest) {
      this.runtimeLowest = runtime;
    }
    if (this.runtimeHighest === null || runtime > this.runtimeHighest) {
      this.runtimeHighest = runtime;
    }
    this.runtimeTotal += runtime;
    this.runtimeVariance = this.calculateVariance();
    this.runtimeStandardDeviation = this.calculateStandardDeviation();
  };

  /**
   * Calculates the variance of the runtime for this middleware
   * @returns The variance of the runtime for this middleware
   */

  calculateVariance = (): number | null => {
    if (this.executedCount === 0) return null;
    const sum = this.runtimeTotal;
    const count = this.executedCount;
    return sum / count;
  };

  /**
   * Calculates the standard deviation of the runtime for this middleware
   * @returns The standard deviation of the runtime for this middleware
   */
  calculateStandardDeviation = (): number | null => {
    if (this.executedCount === 0) return null;
    const variance = this.runtimeVariance ?? 0;
    return Math.sqrt(variance);
  };

  /**
   * Resets the runtime statistics for this middleware
   */
  resetRuntimeStatistics = (): void => {
    this.runtimeAverage = null;
    this.runtimeLowest = null;
    this.runtimeHighest = null;
    this.runtimeTotal = 0;
    this.runtimeVariance = null;
    this.runtimeStandardDeviation = null;
    this.executedCount = 0;
    this.lastExecutedTs = null;
    this.lastExecutedRuntime = null;
    this.lastExecutedResult = null;
  };
}
