import { diff as deepObjectDiff } from 'deep-object-diff';

export type GenericObject = Record<string, unknown>;

const diff = deepObjectDiff;

const findChanges = (
  obj1: { [key: string]: unknown },
  obj2: { [key: string]: unknown },
) => {
  const changes: {
    key: string;
    oldValue: unknown;
    newValue: unknown;
  }[] = [];
  const diffState = diff(obj1, obj2);
  Object.entries(diffState).forEach(([key, value]) => {
    const obj1Val = obj1[key];
    if (typeof value === 'object') {
      if (typeof obj1Val !== 'object') {
        changes.push({
          key,
          oldValue: `type ${typeof obj1Val}`,
          newValue: `type ${typeof value}`,
        });
      } else {
        const inner = findChanges(
          obj1Val as GenericObject,
          obj2[key] as GenericObject,
        );
        inner.forEach((change) => {
          change.key = `${key}.${change.key}`;
        });
        changes.push(...inner);
      }
    } else {
      const isSame = obj1Val === value;
      if (!isSame) {
        changes.push({
          key,
          oldValue: obj1Val,
          newValue: value,
        });
      }
    }
  });
  return changes;
};

const isObject = (item: unknown): item is GenericObject =>
  typeof item === 'object' && item !== null;

const isObjectEmpty = (item: unknown): item is GenericObject =>
  isObject(item) && Object.keys(item).length === 0;

const deepMerge = <T extends GenericObject>(obj1: T, obj2: T): T => {
  const result = { ...obj1 };
  for (const [key, value] of Object.entries(obj2)) {
    const obj1Val = obj1[key];
    const obj2Val = value;
    const areBothObj = isObject(obj1Val) && isObject(obj2Val);
    Object.defineProperty(result, key, {
      value: areBothObj ? deepMerge(obj1Val, obj2Val) : obj2Val,
      writable: true,
      configurable: true,
    });
  }
  return result;
};

const deepClone = <T extends GenericObject>(obj: T): T =>
  JSON.parse(JSON.stringify(obj));

export class ObjectUtils {
  static readonly diff = diff;
  static readonly findChanges = findChanges;
  static readonly isObject = isObject;
  static readonly isObjectEmpty = isObjectEmpty;
  static readonly deepMerge = deepMerge;
  static readonly deepClone = deepClone;
}
