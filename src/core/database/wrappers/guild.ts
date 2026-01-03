import { ModerationAction } from '@prisma/client';
import { Model } from '../models';
import { type PopulatedGuild } from '../select';
import { DatabaseWrapper } from './wrapper';
import { UnitConstants } from '@core/constants/units';

class GuildWrapper extends DatabaseWrapper<Model.Guild> {
  constructor() {
    super(Model.Guild);
  }

  async resolve(id: string): Promise<PopulatedGuild> {
    return this.upsert({
      where: { id },
      create: {
        id,
        CaseCounter: {
          create: {
            caseNumber: 0,
            GuildId: id,
          },
        },
        AutoModerationActions: {
          create: {
            // Note: Default moderation action for new guilds.
            // This is a mute that lasts for 30 minutes, triggered
            // every 3 warnings points a member receives.
            action: ModerationAction.MUTE_DURATION,
            oncePerMember: false,
            triggerThreshold: 3,
            actionDurationMs: UnitConstants.MS_IN_ONE_MINUTE * 30,
            deleteMessageSeconds: null,
          },
        },
      },
      update: {},
    });
  }
}

const guildWrapper = new GuildWrapper();

export { guildWrapper };
