import { prismaClient } from '../client';
import { Model } from '../models';
import { ModelGroupByArgs, ModelGroupByPayload, ThenArg } from '../types';
import { toPrismaModelName } from './args';

export const groupByPopulatedModel = async <T extends Model>(
  model: T,
  query: ModelGroupByArgs[T],
): Promise<ThenArg<ModelGroupByPayload[T]>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const grouped = prismaClient[prismaModel].groupBy(query);

  return grouped;
};
