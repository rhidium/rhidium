import {
  AutoCompleteOption,
  Database,
  InteractionUtils,
  PermissionUtils,
  PermLevel,
  PopulatedWarning,
} from '@core';
import { WarnServices } from '../services/warn';

const WarningOption = new AutoCompleteOption<PopulatedWarning>({
  name: 'warning',
  description: 'Select a warning',
  required: true,
  run: async (query, client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) {
      return [];
    }

    const { guild: discordGuild, member: discordMember, options } = interaction;
    const permLevel = await PermissionUtils.resolveMemberPermissionLevel(
      client,
      discordMember,
      discordGuild,
    );

    if (permLevel < PermLevel.Moderator) {
      return [];
    }

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
      return [
        {
          name: 'No warnings found that match the query',
          value: 'null',
        },
      ];
    }

    return filtered.map((warn) => ({
      name: WarnServices.stringifyWarn(warn, false),
      value: warn.id.toString(),
    }));
  },
  resolveValue: async (value, client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) {
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
            id: valueInt,
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

    return warning ?? null;
  },
});

export default WarningOption;
