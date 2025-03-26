import { diff as deepObjectDiff } from 'deep-object-diff';

const diff = deepObjectDiff;

const diffAsChanges = (
  originalObj: GenericObject,
  updatedObj: GenericObject,
): ObjectChange[] => {
  const changes: ObjectChange[] = [];
  const diffState = diff(originalObj, updatedObj);

  Object.entries(diffState).forEach(([key, value]) => {
    const originalVal = originalObj[key];
    if (typeof value === 'object') {
      if (typeof originalVal !== 'object') {
        changes.push({
          key,
          oldValue: `type ${typeof originalVal}`,
          newValue: `type ${typeof value}`,
        });
      } else {
        const inner = diffAsChanges(
          originalVal as GenericObject,
          updatedObj[key] as GenericObject,
        );
        inner.forEach((change) => {
          change.key = `${key}.${change.key}`;
        });
        changes.push(...inner);
      }
    } else {
      const isSame = originalVal === value;
      if (!isSame) {
        changes.push({
          key,
          oldValue: originalVal,
          newValue: value,
        });
      }
    }
  });

  return changes;
};

const isObject = (item: unknown): item is GenericObject =>
  typeof item === 'object' && item !== null;

const isEmptyObject = (item: unknown): item is GenericObject =>
  isObject(item) && Object.keys(item).length === 0;

type GenericObject = Record<string, unknown>;
type ObjectChange = {
  key: string;
  oldValue: unknown;
  newValue: unknown;
};

class ObjectUtils {
  /**
   * Deeply compare two objects and return the differences
   * @param originalObj The first/initial object
   * @param updatedObj The second object to compare against
   * @returns The differences between the two objects
   */
  static readonly diff = diff;
  /**
   * Deeply compare two objects and return the differences as changes
   * @param originalObj The first/initial object
   * @param updatedObj The second object to compare against
   * @returns The differences between the two objects as changes
   */
  static readonly diffAsChanges = diffAsChanges;
  /**
   * Type guard to check if an item is an object
   * @param item The item to check
   * @returns Whether the item is an object
   */
  static readonly isObject = isObject;
  /**
   * Type guard to check if an item is an empty object
   * @param item The item to check
   * @returns Whether the item is an empty object
   */
  static readonly isEmptyObject = isEmptyObject;
}

export { ObjectUtils, type GenericObject, type ObjectChange };
