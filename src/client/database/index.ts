import { PrismaClient } from '@prisma/client';

/** Singleton prisma client */
export const prisma = new PrismaClient();

export * from './CommandCooldown';
export * from './Guilds';
