import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export * from './CommandCooldown';
export * from './CommandStatistics';
export * from './Guilds';
