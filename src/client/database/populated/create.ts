import { GetBatchResult } from '@prisma/client/runtime/library';
import { prismaClient } from '../client';
import { Model } from '../models';
import {
  ModelCreateArgs,
  ModelCreateManyAndReturnArgs,
  ModelCreateManyArgs,
  ModelGetPayload,
  ThenArg,
} from '../types';
import { resolvePopulatedModelArgs, toPrismaModelName } from './args';

export const createPopulatedModel = async <T extends Model>(
  model: T,
  data: ModelCreateArgs[T]['data'],
): Promise<ThenArg<ModelGetPayload[T]>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].create({
    ...resolvePopulatedModelArgs(model),
    data,
  });

  return populatedModel;
};

export const createManyPopulatedModel = async <T extends Model>(
  model: T,
  query: ModelCreateManyArgs[T],
): Promise<ThenArg<GetBatchResult>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].createMany(query);

  return populatedModel;
};

export const createManyPopulatedModelAndReturn = async <T extends Model>(
  model: T,
  query?: Omit<ModelCreateManyAndReturnArgs[T], 'select' | 'include'>,
): Promise<ThenArg<ModelGetPayload[T]>[]> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].createManyAndReturn({
    ...resolvePopulatedModelArgs(model),
    ...query,
  });

  return populatedModel;
};
