import { ModerationAction } from '@prisma/client';
import { Model } from '../models';
import { PopulatedGuild } from '../select';
import { DatabaseWrapper } from './wrapper';
import { UnitConstants } from '../../constants';
import { ModerationServices } from '../../../modules/moderation/services/moderation';

class GuildWrapper extends DatabaseWrapper<Model.Guild> {
  constructor() {
    super(Model.Guild);
  }

  async resolve(id: string): Promise<PopulatedGuild> {
    return this.upsert({
      where: { id },
      create: {
        id,
        useModLogChannel: true,
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
        SeverityConfiguration: {
          create: {
            LOW: ModerationServices.defaultSeverityConfiguration.LOW,
            MEDIUM: ModerationServices.defaultSeverityConfiguration.MEDIUM,
            HIGH: ModerationServices.defaultSeverityConfiguration.HIGH,
          },
        },
      },
      update: {},
    });
  }
}

const guildWrapper = new GuildWrapper();

export { guildWrapper };
