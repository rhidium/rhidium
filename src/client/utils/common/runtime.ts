import { UnitConstants } from '@client/constants';
import { NumberUtils } from './numbers';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sleepUntil = async (
  condition: () => boolean | Promise<boolean>,
  interval = UnitConstants.MS_IN_ONE_SECOND,
) => {
  while (!(await condition())) await sleep(interval);
};

const sleepUntilOrTimeout = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number,
  interval = UnitConstants.MS_IN_ONE_SECOND,
) => {
  const start = Date.now();
  while (!(await condition()) && Date.now() - start < timeout)
    await sleep(interval);
};

const awaitOrTimeout = <T>(promise: Promise<T>, timeout: number) => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Promise timed out after ${timeout}ms`));
    }, timeout);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason) => {
        clearTimeout(timer);
        reject(reason);
      },
    );
  });
};

const safeSetTimeout = (
  timeoutMs: number,
  scheduleOverflowInFuture: boolean,
  fn: () => void,
  onNewTimeout?: (timeout: NodeJS.Timeout, isTimeoutForRunFn: boolean) => void,
): NodeJS.Timeout => {
  if (timeoutMs < 0) {
    throw new Error('Timeout value is negative');
  }

  const isSafe = timeoutMs <= NumberUtils.INT32_MAX;

  if (!isSafe && !scheduleOverflowInFuture) {
    throw new Error(
      "Timeout value is too large, as it doesn't fit in an int32",
    );
  }

  if (isSafe) {
    return setTimeout(fn, timeoutMs);
  }

  const scheduleTimeout = (_timeoutMs: number): NodeJS.Timeout => {
    let timeout: NodeJS.Timeout;
    let isTimeoutForRunFn = false;

    if (_timeoutMs > NumberUtils.INT32_MAX) {
      timeout = setTimeout(() => {
        scheduleTimeout(_timeoutMs - NumberUtils.INT32_MAX);
      }, NumberUtils.INT32_MAX);
    } else {
      isTimeoutForRunFn = true;
      timeout = setTimeout(() => {
        fn();
      }, _timeoutMs);
    }

    if (timeoutMs !== _timeoutMs) {
      onNewTimeout?.(timeout, isTimeoutForRunFn);
    }

    return timeout;
  };

  return scheduleTimeout(timeoutMs);
};

const safeSetInterval = (
  intervalMs: number,
  fn: () => void | void,
  onNewTimeout?: (timeout: NodeJS.Timeout, isTimeoutForRunFn: boolean) => void,
): NodeJS.Timeout => {
  return safeSetTimeout(
    intervalMs,
    true,
    () => {
      fn();
      safeSetInterval(intervalMs, fn, onNewTimeout);
    },
    onNewTimeout,
  );
};

const safeSetAsyncInterval = (
  intervalMs: number,
  fn: () => Promise<void>,
  onNewTimeout?: (timeout: NodeJS.Timeout, isTimeoutForRunFn: boolean) => void,
): NodeJS.Timeout => {
  return safeSetTimeout(
    intervalMs,
    true,
    async () => {
      await fn();
      safeSetAsyncInterval(intervalMs, fn, onNewTimeout);
    },
    onNewTimeout,
  );
};

class RuntimeUtils {
  /**
   * Sleep/wait for a specified amount of time
   * @param ms The number of milliseconds to sleep
   * @returns A promise that resolves after specified time
   */
  static readonly sleep = sleep;
  /**
   * Sleep until a condition is met
   * @param condition The condition to wait for
   * @param interval The interval to check the condition, in milliseconds
   * @returns A promise that resolves when the condition is met/true
   */
  static readonly sleepUntil = sleepUntil;
  /**
   * Sleep until a condition is met or a timeout is reached
   * @param condition The condition to wait for
   * @param timeout The maximum time to wait, in milliseconds
   * @param interval The interval to check the condition, in milliseconds
   * @returns A promise that resolves when the condition is met/true
   */
  static readonly sleepUntilOrTimeout = sleepUntilOrTimeout;
  /**
   * Wait for a promise to resolve, but only for a specified amount of time
   * @param promise The promise to wait for
   * @param timeout The maximum time to wait, in milliseconds
   * @returns A promise that resolves when the input promise resolves
   * @throws An error if the promise does not resolve within the timeout
   * @throws Any error the promise may natively throw
   */
  static readonly awaitOrTimeout = awaitOrTimeout;
  /**
   * Safely schedule a timeout, even if the duration is too large
   * @param timeoutMs The number of milliseconds to wait
   * @param scheduleOverflowInFuture Whether to schedule the overflow in the future
   * @param fn The function to run after the timeout
   * @param onNewTimeout A callback for when a new timeout is scheduled
   * @returns The timeout object
   * @throws An error if the timeout value is negative
   * @throws An error if the timeout value is too large for an int32, and `scheduleOverflowInFuture` is false
   */
  static readonly safeSetTimeout = safeSetTimeout;
  /**
   * Safely schedule an interval, even if the duration is too large.
   * Uses {@link safeSetTimeout} to recursively schedule timeouts
   * @param intervalMs The interval to wait between each call
   * @param fn The function to run after each interval
   * @param onNewTimeout A callback for when a new timeout is scheduled
   * @throws An error if the interval value is negative
   * @returns The interval object
   */
  static readonly safeSetInterval = safeSetInterval;
  /**
   * Safely schedule an async interval, even if the duration is too large.
   * Same as {@link safeSetInterval}, but async promises are awaited, after
   * which the next interval is scheduled
   * @param intervalMs The interval to wait between each call
   * @param fn The async function to run after each interval
   * @param onNewTimeout A callback for when a new timeout is scheduled
   * @throws An error if the interval value is negative
   * @returns The interval object
   */
  static readonly safeSetAsyncInterval = safeSetAsyncInterval;
}

export { RuntimeUtils };
