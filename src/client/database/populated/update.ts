import { GetBatchResult } from '@prisma/client/runtime/library';
import { prismaClient } from '../client';
import { Model } from '../models';
import {
  ModelGetPayload,
  ModelUpdateArgs,
  ModelUpdateManyArgs,
  ModelUpsertArgs,
  ThenArg,
} from '../types';
import { resolvePopulatedModelArgs, toPrismaModelName } from './args';

export const updatePopulatedModel = async <T extends Model>(
  model: T,
  query: Omit<ModelUpdateArgs[T], 'select' | 'include'>,
): Promise<ThenArg<ModelGetPayload[T]>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].update({
    ...resolvePopulatedModelArgs(model),
    ...query,
  });

  return populatedModel;
};

export const updateManyPopulatedModel = async <T extends Model>(
  model: T,
  query: ModelUpdateManyArgs[T],
): Promise<ThenArg<GetBatchResult>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].updateMany(query);

  return populatedModel;
};

export const upsertPopulatedModel = async <T extends Model>(
  model: T,
  query: Omit<ModelUpsertArgs[T], 'select' | 'include'>,
): Promise<ThenArg<ModelGetPayload[T]>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].upsert({
    ...resolvePopulatedModelArgs(model),
    ...query,
  });

  return populatedModel;
};
