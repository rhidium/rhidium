import { ApplicationCommandType } from 'discord.js';
import { ComponentCommandType } from '../../commands';
import { Model } from '../models';
import { Prisma } from '@prisma/client';
import { DatabaseWrapper } from './wrapper';

class CommandStatisticsWrapper extends DatabaseWrapper<Model.CommandStatistics> {
  constructor() {
    super(Model.CommandStatistics);
  }

  readonly byCommandId = async (
    name: string,
    type: ApplicationCommandType | ComponentCommandType,
  ) => {
    return this.upsert({
      where: { commandId: name, type },
      create: { commandId: name, type, runtimeCount: 0 },
      update: {},
    });
  };

  readonly updateByCommandId = async (
    commandId: string,
    type: ApplicationCommandType | ComponentCommandType,
    data: Prisma.CommandStatisticsUpdateInput,
  ) => {
    return this.update({
      where: { commandId, type },
      data,
    });
  };
}

const commandStatisticsWrapper = new CommandStatisticsWrapper();

export { commandStatisticsWrapper };
