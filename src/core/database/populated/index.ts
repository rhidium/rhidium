import { prismaClient } from '../client';
import {
  createManyPopulatedModel,
  createManyPopulatedModelAndReturn,
  createPopulatedModel,
} from './create';
import { deleteManyPopulatedModel, deletePopulatedModel } from './delete';
import {
  findFirstPopulatedModel,
  findFirstPopulatedModelOrThrow,
  findManyPopulatedModel,
  findUniquePopulatedModel,
  findUniquePopulatedModelOrThrow,
} from './find';
import { groupByPopulatedModel } from './group';
import {
  aggregatePopulatedModel,
  countPopulatedModel,
  fieldsPopulatedModel,
} from './other';
import {
  updateManyPopulatedModel,
  updatePopulatedModel,
  upsertPopulatedModel,
} from './update';

export class PopulatedPrisma {
  private constructor() {}

  //
  // Standard Prisma Operations
  //

  static $connect = prismaClient.$connect.bind(prismaClient);
  static $disconnect = prismaClient.$disconnect.bind(prismaClient);
  static $executeRaw = prismaClient.$executeRaw.bind(prismaClient);
  static $executeRawUnsafe = prismaClient.$executeRawUnsafe.bind(prismaClient);
  static $extends: typeof prismaClient.$extends =
    prismaClient.$extends.bind(prismaClient);
  static $queryRaw = prismaClient.$queryRaw.bind(prismaClient);
  static $queryRawUnsafe = prismaClient.$queryRawUnsafe.bind(prismaClient);
  static $transaction: typeof prismaClient.$transaction =
    prismaClient.$transaction.bind(prismaClient);

  //
  // Other/Etc. Operations
  //

  static aggregate = aggregatePopulatedModel;
  static count = countPopulatedModel;
  static fields = fieldsPopulatedModel;

  //
  // Create Operations
  //

  static create = createPopulatedModel;
  static createMany = createManyPopulatedModel;
  static createManyAndReturn = createManyPopulatedModelAndReturn;

  //
  // Delete Operations
  //

  static delete = deletePopulatedModel;
  static deleteMany = deleteManyPopulatedModel;

  //
  // Find Operations
  //

  static findFirst = findFirstPopulatedModel;
  static findFirstOrThrow = findFirstPopulatedModelOrThrow;
  static findMany = findManyPopulatedModel;
  static findUnique = findUniquePopulatedModel;
  static findUniqueOrThrow = findUniquePopulatedModelOrThrow;

  //
  // Group Operations
  //

  static groupBy = groupByPopulatedModel;

  //
  // Update Operations
  //

  static update = updatePopulatedModel;
  static updateMany = updateManyPopulatedModel;
  static upsert = upsertPopulatedModel;
}
