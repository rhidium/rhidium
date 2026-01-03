import { Model } from '../models';
import { populateModelArgs, type PrismaModelName } from '../types';

export const toPrismaModelName = (str: string): PrismaModelName => {
  return str.replace(/([-_][a-z])/gi, ($1) =>
    $1.toUpperCase().replace('-', '').replace('_', ''),
  ) as PrismaModelName;
};

export const resolvePopulatedModelArgs = <T extends Model>(
  model: T,
): (typeof populateModelArgs)[T] => {
  return populateModelArgs[model];
};
