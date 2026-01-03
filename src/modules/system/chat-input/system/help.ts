import type Client from '@core/client';
import { ApplicationCommandOptionType, Collection } from 'discord.js';
import CommandOrCategoryCommand from '../../auto-completes/command-or-category';
import { I18n } from '@core/i18n';
import { Command } from '@core/commands/base';
import { TimeUtils } from '@core/utils/common/time';
import { UnitConstants } from '@core/constants/units';
import { CommandThrottle } from '@core/commands/throttle';
import { Embeds } from '@core/config/embeds';
import { StringUtils } from '@core/utils/common/strings';
import { Permissions } from '@core/commands/permissions';
import { appConfig } from '@core/config/app';
import { commandDeploymentEnvironment } from '@core/commands/defaults';
import { CommandType } from '@core/commands/types';
import { EmbedConstants } from '@core/constants/embeds';
import { Database } from '@core/database/wrappers';

class EmbedResolver {
  static readonly commandEmbed = (cmd: Command) => {
    const { throttle } = cmd;
    const description =
      'description' in cmd.data ? cmd.data.description : 'n/a';
    const cooldownUsagesOutput =
      throttle.limit === 1 ? '1 use' : `${throttle.limit} uses`;
    const cooldownOutput = throttle.enabled
      ? [
          `**${cooldownUsagesOutput}** in **${TimeUtils.humanReadableMs(
            throttle.duration,
          ).replace(
            'Just now',
            `${Math.round(throttle.duration / UnitConstants.MS_IN_ONE_SECOND)} seconds`,
          )}**`,
          `(type \`${CommandThrottle.resolveThrottleTypeName(throttle.type)}\`)`,
        ].join(' ')
      : 'n/a';

    const embed = Embeds.info({
      title: `Command: ${cmd.idWithoutPrefix}`,
      description: `\`\`\`${description}\`\`\``,
      fields: [
        {
          name: '⏱️ Cooldown',
          value: cooldownOutput,
          inline: false,
        },

        {
          name: '#️⃣ Category',
          value: StringUtils.titleCase(cmd.category),
          inline: true,
        },
        {
          name: '🛡️ Permission Level',
          value: `${Permissions.intToString(cmd.permissions.level)}`,
          inline: true,
        },

        {
          name: '🔞 NSFW',
          value: cmd.enabled.nsfw
            ? `${appConfig.emojis.success} Yes`
            : `${appConfig.emojis.error} No`,
          inline: true,
        },
        {
          name: '💬 DM',
          value: !cmd.enabled.guildOnly
            ? `${appConfig.emojis.success} Yes`
            : `${appConfig.emojis.error} No`,
          inline: true,
        },
      ],
    });

    if (cmd.permissions.client.length > 0) {
      embed.addFields({
        name: '🔑 Client Permissions (me)',
        value: Permissions.displayPermissions(cmd.permissions.client, '\n'),
        inline: true,
      });
    }

    if (cmd.permissions.user.length > 0) {
      embed.addFields({
        name: '🔑 User Permissions (you)',
        value: Permissions.displayPermissions(cmd.permissions.user, '\n'),
        inline: true,
      });
    }

    return embed;
  };

  static readonly categoryEmbeds = async (
    client: Client,
    category: string,
    commands: Collection<string, Command>,
  ) => {
    const apiCommandData = await client.manager.REST.fetchApiCommands(
      commandDeploymentEnvironment,
    );
    const allFields = commands
      .toJSON()
      .filter((e) => apiCommandData.find((f) => f.name === e.idWithoutPrefix))
      .map((e) => {
        const apiCmd = apiCommandData.find((f) => f.name === e.idWithoutPrefix);
        const isSubCmdGroupOnlyCmd = !!(
          apiCmd?.options.length &&
          !apiCmd?.options.find(
            (e) =>
              e.type !== ApplicationCommandOptionType.SubcommandGroup &&
              e.type !== ApplicationCommandOptionType.Subcommand,
          )
        );
        const optionsOutput =
          apiCmd && apiCmd.options.length > 0
            ? ` +${apiCmd.options.length} option${apiCmd.options.length === 1 ? '' : 's'}`
            : null;
        const nameOutput = apiCmd
          ? `</${apiCmd.name}:${apiCmd.id}>`
          : `/${e.idWithoutPrefix}`;
        const suffix = optionsOutput ?? '';
        const nameWithOptionsOutput = apiCmd
          ? `${apiCmd ? nameOutput : `${nameOutput}`}${isSubCmdGroupOnlyCmd ? ` - ${apiCmd.description}` : suffix.length ? `${suffix}` : ''}`
          : e.idWithoutPrefix;
        const subCmdOnlyOutput = isSubCmdGroupOnlyCmd
          ? // https://discord.com/developers/docs/reference#message-formatting
            apiCmd?.options.map((f) => {
              const apiCmdOption = apiCmd.options.find(
                (e) => e.name === f.name,
              );
              return apiCmdOption?.type ===
                ApplicationCommandOptionType.Subcommand
                ? `</${apiCmd.name} ${f.name}:${apiCmd.id}> - ${f.description}`
                : apiCmdOption?.type ===
                    ApplicationCommandOptionType.SubcommandGroup
                  ? (apiCmdOption.options
                      ?.filter(
                        (g) =>
                          g.type === ApplicationCommandOptionType.Subcommand,
                      )
                      .map(
                        (g) =>
                          `</${apiCmd.name} ${f.name} ${g.name}:${apiCmd.id}> - ${g.description}`,
                      )
                      .join('\n') ?? `</${apiCmd.name} ${f.name}:${apiCmd.id}>`)
                  : `${nameOutput} ${f.name} - ${f.description}`;
            })
          : null;
        let description =
          'description' in e.data
            ? isSubCmdGroupOnlyCmd
              ? ''
              : e.data.description
            : e.type === CommandType.UserContextMenu
              ? "No description available for this command, as it's a user context menu command."
              : e.type === CommandType.MessageContextMenu
                ? "No description available for this command, as it's a message context menu command."
                : 'n/a';
        if (subCmdOnlyOutput) description += `\n${subCmdOnlyOutput.join('\n')}`;
        return {
          name: `${nameWithOptionsOutput}`,
          value: description,
          inline: false,
        };
      });
    const chunkSize = EmbedConstants.MAX_FIELDS_PER_EMBED;
    const embeds = [];
    for (let i = 0; i < allFields.length; i += chunkSize) {
      const fields = allFields.slice(i, i + chunkSize);
      const embed = Embeds.info({
        title: `Category: ${StringUtils.titleCase(category)}`,
        description: `Commands in this category: ${commands.size}`,
        fields,
      });
      embeds.push(embed);
    }

    return embeds;
  };
}

const HelpCommand = new Command({
  type: CommandType.ChatInputPlain,
  interactions: {
    replyEphemeral: true,
  },
  data: (builder) =>
    builder
      .setName('help')
      .setDescription('Get help with commands, and learn how to use them')
      .addStringOption(CommandOrCategoryCommand.data),
  run: async ({ client, interaction }) => {
    const { member, guild } = interaction;
    const result = CommandOrCategoryCommand.resolver({
      client,
      interaction,
    });

    if (!result) {
      await HelpCommand.reply(
        interaction,
        Embeds.error(
          I18n.localize('commands:help.noCommandOrCategory', interaction),
        ),
      );
      return;
    }

    // Filter by active/enabled and perm level
    const memberPermLevel = await Permissions.resolveForMember(member, guild, Database);
    const commands = client.manager.apiCommands.filter((cmd) => {
      const { enabled } = cmd;
      return (
        memberPermLevel >= cmd.permissions.level &&
        enabled.global &&
        (interaction.inGuild()
          ? enabled.guildOnly ||
            enabled.guilds === true ||
            (Array.isArray(enabled.guilds) &&
              enabled.guilds.includes(interaction.guildId))
          : enabled.guildOnly === false)
      );
    });

    // Handle category overview
    if (typeof result === 'string') {
      await HelpCommand.reply(interaction, {
        embeds: await EmbedResolver.categoryEmbeds(
          client,
          result,
          commands.filter((c) => c.category === result),
        ),
      });
    }

    // Handle command overview
    else {
      await HelpCommand.reply(interaction, EmbedResolver.commandEmbed(result));
    }
  },
});

export default HelpCommand;
