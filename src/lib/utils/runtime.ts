import { Colors } from 'discord.js';
import { ArrayUtils } from '.';
import { UnitConstants } from '../constants';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const wait = sleep;

const waitUntil = async (
  condition: () => boolean | Promise<boolean>,
  interval = UnitConstants.MS_IN_ONE_SECOND,
) => {
  while (!(await condition())) await sleep(interval);
};

const waitUntilTimeout = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number,
  interval = UnitConstants.MS_IN_ONE_SECOND,
) => {
  const start = Date.now();
  while (!(await condition()) && Date.now() - start < timeout)
    await sleep(interval);
};

const promisifyTimeout = <T>(promise: Promise<T>, timeout: number) => {
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

const randomBoolean = () => Math.random() < 0.5;

const randomColor = () => ArrayUtils.randomItemValue(Colors);

const randomColorKey = () => ArrayUtils.randomItemKey(Colors);

/**
 * Assert that a condition is true, throwing an error if it is not
 *
 * Note: This function is intended to be used in places where TypeScript
 * cannot infer that a condition is true, but the developer knows that
 * it is true. This is useful for type narrowing in TypeScript.
 */
function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export class RuntimeUtils {
  static readonly sleep = sleep;
  static readonly wait = wait;
  static readonly waitUntil = waitUntil;
  static readonly waitUntilTimeout = waitUntilTimeout;
  static readonly promisifyTimeout = promisifyTimeout;
  static readonly randomBoolean = randomBoolean;
  static readonly randomColor = randomColor;
  static readonly randomColorKey = randomColorKey;
  static readonly assert = assert;
}
