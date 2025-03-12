import { UnitConstants } from '../../constants';

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
}

export { RuntimeUtils };
