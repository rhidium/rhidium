import { prismaClient } from '../client';
import { Model } from '../models';
import {
  ModelFindFirstArgs,
  ModelFindManyArgs,
  ModelFindUniqueArgs,
  ModelGetPayload,
  ThenArg,
} from '../types';
import { resolvePopulatedModelArgs, toPrismaModelName } from './args';

export const findFirstPopulatedModel = async <T extends Model>(
  model: T,
  query?: Omit<ModelFindFirstArgs[T], 'select' | 'include'>,
): Promise<ThenArg<ModelGetPayload[T]> | null> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].findFirst({
    ...resolvePopulatedModelArgs(model),
    ...query,
  });

  return populatedModel;
};

export const findFirstPopulatedModelOrThrow = async <T extends Model>(
  model: T,
  query?: Omit<ModelFindFirstArgs[T], 'select' | 'include'>,
): Promise<ThenArg<ModelGetPayload[T]>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].findFirstOrThrow({
    ...resolvePopulatedModelArgs(model),
    ...query,
  });

  return populatedModel;
};

export const findManyPopulatedModel = async <T extends Model>(
  model: T,
  query?: Omit<ModelFindManyArgs[T], 'select' | 'include'>,
): Promise<ThenArg<ModelGetPayload[T]>[]> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].findMany({
    ...resolvePopulatedModelArgs(model),
    ...query,
  });

  return populatedModel;
};

export const findUniquePopulatedModel = async <T extends Model>(
  model: T,
  where: ModelFindUniqueArgs[T]['where'],
): Promise<ThenArg<ModelGetPayload[T]> | null> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].findUnique({
    ...resolvePopulatedModelArgs(model),
    where,
  });

  return populatedModel;
};

export const findUniquePopulatedModelOrThrow = async <T extends Model>(
  model: T,
  where: ModelFindUniqueArgs[T]['where'],
): Promise<ThenArg<ModelGetPayload[T]>> => {
  const prismaModel = toPrismaModelName(model);

  // @ts-expect-error - Incompatible type signatures
  const populatedModel = prismaClient[prismaModel].findUniqueOrThrow({
    ...resolvePopulatedModelArgs(model),
    where,
  });

  return populatedModel;
};
