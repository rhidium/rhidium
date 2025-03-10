import {
  ChatInputCommand,
  CommandCooldownType,
  PermLevel,
  UnitConstants,
} from '@rhidium/core';
import {
  ActivitiesOptions,
  ActivityType,
  PresenceData,
  SlashCommandBuilder,
} from 'discord.js';

enum PresenceStatusData {
  Online = 'online',
  Idle = 'idle',
  Dnd = 'dnd',
  Invisible = 'invisible',
}

const ChangeStatusCommand = new ChatInputCommand({
  cooldown: {
    duration: UnitConstants.MS_IN_ONE_HOUR,
    usages: 2,
    type: CommandCooldownType.Global,
    persistent: true,
  },
  permLevel: PermLevel['Bot Administrator'],
  data: new SlashCommandBuilder()
    .setDescription("Change the bot's status")
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
  run: async (client, interaction) => {
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

    await ChangeStatusCommand.deferReplyInternal(interaction);

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
    if (client.cluster) {
      await client.cluster.broadcastEval(
        (c, { presenceOptions }) => {
          presenceOptions.shardId = c.cluster ? [...c.cluster.ids.keys()] : 0;
          c.user.presence.set(presenceOptions);
        },
        { context: { presenceOptions } },
      );
    } else client.user.presence.set(presenceOptions);

    await ChangeStatusCommand.reply(
      interaction,
      client.embeds.success(`Activity changed to **\`${activity}\`**`),
    );
  },
});

export default ChangeStatusCommand;
