const isEven = (n: number) => n % 2 === 0;

const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;

/**
 * Calculate the mean of an array of numbers. Also
 * known as the average. Sensitive to outliers.
 */
const calculateMean = (values: number[]) => {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  return average;
};

/**
 * The median is the middle value of a dataset when it is ordered from smallest to largest.
 * If there is an even number of values, the median is the average of the two middle values.
 * Not as sensitive to outliers as the mean.
 */
const calculateMedian = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sorted.length / 2);
  const isEven = sorted.length % 2 === 0;
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

/**
 * Calculate the variance of an array of numbers.
 * It measures how far each value in the dataset is from the mean.
 */
const calculateVariance = (values: number[]) => {
  if (values.length === 0) return null;
  const mean = calculateMean(values);
  if (typeof mean !== 'number') return null;
  const squaredDifferences = values.map((value) => Math.pow(value - mean, 2));
  const variance = calculateMean(squaredDifferences);
  return variance;
};

/**
 * The standard deviation is a measure of how spread out numbers are.
 * It is the square root of the variance.
 */
const calculateStandardDeviation = (values: number[]) => {
  const variance = calculateVariance(values);
  if (typeof variance !== 'number') return null;
  return Math.sqrt(variance);
};

export class NumberUtils {
  static readonly isEven = isEven;
  static readonly randomInteger = randomInteger;
  static readonly randomFloat = randomFloat;
  static readonly calculateMean = calculateMean;
  static readonly calculateMedian = calculateMedian;
  static readonly calculateVariance = calculateVariance;
  static readonly calculateStandardDeviation = calculateStandardDeviation;
}
