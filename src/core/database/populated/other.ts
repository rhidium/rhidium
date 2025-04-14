import { prismaClient } from '../client';
import { Model } from '../models';
import {
  ModelAggregateArgs,
  ModelAggregateResult,
  ModelCountArgs,
  ModelFieldRefs,
  ThenArg,
} from '../types';
import { toPrismaModelName } from './args';

export const aggregatePopulatedModel = async <T extends Model>(
  model: T,
  query?: ModelAggregateArgs[T],
): Promise<ThenArg<ModelAggregateResult[T]>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const aggregated = prismaClient[prismaModel].aggregate(query);

  return aggregated;
};

export const countPopulatedModel = async <T extends Model>(
  model: T,
  query?: Omit<ModelCountArgs[T], 'select' | 'include'>,
): Promise<number> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const count = prismaClient[prismaModel].count({
    ...query,
  });

  return count;
};

export const fieldsPopulatedModel = <T extends Model>(
  model: T,
): ModelFieldRefs[T] => {
  const prismaModel = toPrismaModelName(model);

  if (!('fields' in prismaClient[prismaModel])) {
    throw new Error(`Unable to retrieve fields for model ${model}`);
  }

  return prismaClient[prismaModel].fields as ModelFieldRefs[T];
};
