const chunk = <T>(arr: T[], size = 10): T[][] => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, size + i));
  }
  return result;
};

const randomItem = <T>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)];

const randomItemKey = <T>(items: Record<string, T>) =>
  randomItem(Object.keys(items));

const randomItemValue = <T>(items: Record<string, T>) =>
  randomItem(Object.values(items));

const joinWithLimit = (
  items: string[],
  maxItems: number,
  emptyOutput = 'None',
): string => {
  if (items.length === 0) return emptyOutput;
  if (items.length <= maxItems) {
    return items.join(', ');
  } else {
    const includedItems = items.slice(0, maxItems);
    const excludedItemsCount = items.length - maxItems;
    const excludedItemsMessage = `and ${excludedItemsCount} more...`;
    return includedItems.join(', ') + ', ' + excludedItemsMessage;
  }
};

export class ArrayUtils {
  static readonly chunk = chunk;
  static readonly randomItem = randomItem;
  static readonly randomItemKey = randomItemKey;
  static readonly randomItemValue = randomItemValue;
  static readonly joinWithLimit = joinWithLimit;
}
