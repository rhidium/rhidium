import { Command, CommandThrottleType, CommandType } from '@core/commands';
import { Embeds } from '@core/config';
import { UnitConstants } from '@core/constants';
import { ActivitiesOptions, ActivityType, PresenceData } from 'discord.js';

enum PresenceStatusData {
  Online = 'online',
  Idle = 'idle',
  Dnd = 'dnd',
  Invisible = 'invisible',
}

const ChangePresenceCommand = new Command({
  type: CommandType.ChatInputPlain,
  throttle: {
    enabled: true,
    duration: UnitConstants.MS_IN_ONE_HOUR,
    limit: 2,
    type: CommandThrottleType.Global,
  },
  interactions: {
    replyEphemeral: true,
    deferReply: true,
  },
  data: (builder) =>
    builder
      .setName('change-presence')
      .setDescription("Change the bot's status/presence")
      .addStringOption((option) =>
        option
          .setName('activity')
          .setDescription('The activity text/name to set')
          .setRequired(true)
          .setMinLength(1),
      )
      .addStringOption((option) =>
        option
          .setName('activity-type')
          .setDescription('The activity-type to use')
          .setRequired(false)
          .setChoices(
            ...Object.entries(ActivityType)
              .filter((e) => typeof e[0] === 'string')
              .map(([key, value]) => ({ name: key, value: `${value}` })),
          ),
      )
      .addStringOption((option) =>
        option
          .setName('activity-url')
          .setDescription(
            'The activity URL to set, only used when type is `STREAMING`, supports Twitch and Youtube',
          )
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('activity-state')
          .setDescription('The activity state to use')
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('status')
          .setDescription('The status to set')
          .setRequired(false)
          .setChoices(
            ...Object.entries(PresenceStatusData).map(([key, value]) => ({
              name: key,
              value,
            })),
          ),
      ),
  run: async ({ client, interaction }) => {
    const { options } = interaction;
    const activity = options.getString('activity', true);
    const activityType = options.getString('activity-type');
    const activityUrl = options.getString('activity-url');
    const activityState = options.getString('activity-state');
    const status = options.getString('status');
    const resolvedStatus =
      PresenceStatusData[status as keyof typeof PresenceStatusData];
    const resolvedActivityType = activityType
      ? ActivityType[activityType as keyof typeof ActivityType]
      : ActivityType.Playing;

    const activityOptions: ActivitiesOptions = {
      name: activity,
      type: resolvedActivityType,
    };
    if (activityState) activityOptions.state = activityState;
    if (activityUrl && resolvedActivityType === ActivityType.Streaming) {
      activityOptions.url = activityUrl;
    }

    const presenceOptions: PresenceData = {
      status: resolvedStatus,
      afk: false,
      activities: [activityOptions],
    };

    client.user.presence.set(presenceOptions);

    await ChangePresenceCommand.reply(
      interaction,
      Embeds.success(`Activity changed to **\`${activity}\`**`),
    );
  },
});

export default ChangePresenceCommand;
