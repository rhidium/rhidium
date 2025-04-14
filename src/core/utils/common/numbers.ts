const isInt = (n: number) => n % 2 === 0;
const isFloat = (n: number) => !isInt(n);

const INT32_MAX = Math.pow(2, 31) - 1;
const INT32_MIN = -Math.pow(2, 31);
const INT64_MAX = BigInt(2) ** BigInt(63) - BigInt(1); //
const INT64_MIN = -(BigInt(2) ** BigInt(63));

const calculateMean = (values: number[]) => {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  return average;
};

const calculateMedian = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sorted.length / 2);
  const isEven = isInt(sorted.length);
  if (isEven) {
    const a = sorted[middleIndex] as number;
    const b = sorted[middleIndex - 1] as number;
    const average = (a + b) / 2;
    return average;
  } else {
    if (sorted.length === 1) return sorted[0] as number;
    const median = sorted[middleIndex] as number;
    return median;
  }
};

const calculateVariance = (values: number[]) => {
  if (values.length === 0) return null;
  const mean = calculateMean(values);
  if (typeof mean !== 'number') return null;
  const squaredDifferences = values.map((value) => Math.pow(value - mean, 2));
  const variance = calculateMean(squaredDifferences);
  return variance;
};

const calculateStandardDeviation = (values: number[]) => {
  const variance = calculateVariance(values);
  if (typeof variance !== 'number') return null;
  return Math.sqrt(variance);
};

const bigIntStringifyHelper = (_: string, value: unknown) =>
  typeof value === 'bigint'
    ? value > BigInt(Number.MAX_SAFE_INTEGER)
      ? value.toString() // Convert large bigints to strings
      : Number(value) // Convert small/safe bigints to numbers
    : value; // Return other values as is

class NumberUtils {
  static readonly isInt = isInt;
  static readonly isFloat = isFloat;
  /** `2147483647` */
  static readonly INT32_MAX = INT32_MAX;
  /** `-2147483648` */
  static readonly INT32_MIN = INT32_MIN;
  /** `9223372036854775807n` */
  static readonly INT64_MAX = INT64_MAX;
  /** `-9223372036854775808n` */
  static readonly INT64_MIN = INT64_MIN;
  static readonly isEven = isInt;
  static readonly isOdd = isFloat;
  /**
   * Calculate the mean of an array of numbers. Also
   * known as the average. Sensitive to outliers.
   * @param values The array of numbers
   * @returns The mean/average of the numbers
   */
  static readonly calculateMean = calculateMean;
  /**
   * The median is the middle value of a dataset when it is ordered from smallest to largest.
   * If there is an even number of values, the median is the average of the two middle values.
   * Not as sensitive to outliers as the mean/average.
   * @param values The array of numbers
   * @returns The median of the numbers
   */
  static readonly calculateMedian = calculateMedian;
  /**
   * Calculate the variance of an array of numbers.
   * It measures how far each value in the dataset is from the mean.
   * @param values The array of numbers
   * @returns The variance of the numbers
   */
  static readonly calculateVariance = calculateVariance;
  /**
   * The standard deviation is a measure of how spread out numbers are.
   * It is the square root of the variance.
   * @param values The array of numbers
   * @returns The standard deviation of the numbers
   */
  static readonly calculateStandardDeviation = calculateStandardDeviation;
  /**
   * A replacer function to handle bigints when stringifying JSON.
   * @param _ The key of the value
   * @param value The value to stringify
   * @returns The stringified value
   */
  static readonly bigIntStringifyHelper = bigIntStringifyHelper;
}

export { NumberUtils };
