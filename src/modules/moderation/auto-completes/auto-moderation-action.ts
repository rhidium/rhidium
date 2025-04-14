import { Command, CommandType } from '@core/commands';
import { ModerationServices } from '../services/moderation';
import { SlashCommandStringOption } from 'discord.js';
import { Database } from '@core/database';

const data = new SlashCommandStringOption()
  .setName('auto-moderation-action')
  .setDescription('Select an auto-moderation action')
  .setRequired(true);

const AutoModerationAutoComplete = new Command({
  data,
  type: CommandType.AutoComplete,
  enabled: {
    guildOnly: true,
  },
  interactions: {
    refuseUncached: true,
  },
  run: async ({ interaction }) => {
    const query = interaction.options.getFocused().toLowerCase();
    const { guild: discordGuild } = interaction;
    const guild = await Database.Guild.resolve(discordGuild.id);
    const actions = guild.AutoModerationActions;

    if (!actions.length) {
      await interaction.respond([
        {
          name: 'No auto-moderation actions configured',
          value: 'null',
        },
      ]);
      return;
    }

    const filtered = actions.filter(
      (action) =>
        action.action.toLowerCase().includes(query.toLowerCase()) ||
        action.actionDurationMs?.toString().includes(query) ||
        action.triggerThreshold.toString().includes(query),
    );

    if (!filtered.length) {
      await interaction.respond([
        {
          name: 'No auto-moderation actions found matching query',
          value: 'null',
        },
      ]);
      return;
    }

    await interaction.respond(
      filtered.map((action) => ({
        name: ModerationServices.stringifyAutoModerationAction(action),
        value: action.id.toString(),
      })),
    );
  },
  resolver: async ({ interaction, options }) => {
    const { optionName = data.name, optionRequired = data.required } =
      options || {};
    const { guild: discordGuild } = interaction;
    const value = interaction.options.getString(optionName, optionRequired);
    const guild = await Database.Guild.resolve(discordGuild.id);
    const action = guild.AutoModerationActions.find(
      (action) => action.id === Number(value),
    );

    return action ?? null;
  },
});

export default AutoModerationAutoComplete;
