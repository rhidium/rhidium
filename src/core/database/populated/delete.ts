import { prismaClient } from '../client';
import { type GetBatchResult } from '@prisma/client/runtime/library';
import {
  ModelDeleteArgs,
  ModelDeleteManyArgs,
  ModelGetPayload,
  ThenArg,
} from '../types';
import { resolvePopulatedModelArgs, toPrismaModelName } from './args';
import { Model } from '../models';

export const deletePopulatedModel = async <T extends Model>(
  model: T,
  where: ModelDeleteArgs[T]['where'],
): Promise<ThenArg<ModelGetPayload[T]>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].delete({
    ...resolvePopulatedModelArgs(model),
    where,
  });

  return populatedModel;
};

export const deleteManyPopulatedModel = async <T extends Model>(
  model: T,
  where?: ModelDeleteManyArgs[T]['where'],
): Promise<ThenArg<GetBatchResult>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].deleteMany({
    where,
  });

  return populatedModel;
};
