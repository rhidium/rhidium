import { SlashCommandStringOption } from 'discord.js';
import { WarnServices } from '../services/warn';
import { Database } from '@core/database/wrappers';
import { CommandType } from '@core/commands/types';
import { Command } from '@core/commands/base';
import { PermLevel } from '@core/commands/permissions';

const data = new SlashCommandStringOption()
  .setName('warning')
  .setDescription('Select a warning')
  .setRequired(true)
  .setAutocomplete(true);

const WarningAutoComplete = new Command({
  data,
  type: CommandType.AutoComplete,
  enabled: {
    guildOnly: true,
  },
  interactions: {
    refuseUncached: true,
  },
  permissions: {
    level: PermLevel.Moderator,
  },
  run: async ({ interaction }) => {
    const query = interaction.options.getFocused().toLowerCase();
    const { guild: discordGuild, options } = interaction;
    const userId = options.data
      .find((option) => option.options?.find((o) => o.name === 'user'))
      ?.options?.find((o) => o.name === 'user')?.value;
    const queryResult = await Database.Member.findMany({
      where: {
        ReceivedWarnings: {
          // Note: Reason/message not included in query for caching reasons
          some: userId
            ? { MemberUserId: userId.toString() }
            : { MemberGuildId: discordGuild.id },
        },
      },
      take: 25,
    });

    const flatWarnings = queryResult.flatMap(
      (member) => member.ReceivedWarnings,
    );

    const filtered = query.length
      ? flatWarnings.filter((warning) =>
          warning.message.toLowerCase().includes(query.toLowerCase()),
        )
      : flatWarnings;

    if (!filtered.length) {
      await interaction.respond([
        {
          name: 'No warnings found that match the query',
          value: 'null',
        },
      ]);
      return;
    }

    await interaction.respond(
      filtered.map((warn) => ({
        name: WarnServices.stringifyWarn(warn, false),
        value: warn.id.toString(),
      })),
    );
  },
  resolver: async ({ interaction, options }) => {
    const { optionName = data.name, optionRequired = data.required } =
      options || {};
    const value = interaction.options.getString(optionName, optionRequired);

    if (value === null) {
      return null;
    }

    const valueInt = parseInt(value, 10);

    if (isNaN(valueInt)) {
      return null;
    }

    const member = await Database.Member.findFirst({
      where: {
        ReceivedWarnings: {
          some: {
            id: parseInt(value, 10),
          },
        },
      },
    });

    if (!member) {
      return null;
    }

    const warning = member.ReceivedWarnings.find(
      (warn) => warn.id === valueInt,
    );

    if (!warning) {
      return null;
    }

    return warning;
  },
});

export default WarningAutoComplete;
