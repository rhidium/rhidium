import {
  ApplicationCommandOptionType,
  Collection,
  SlashCommandBuilder,
} from 'discord.js';
import {
  Lang,
  ChatInputCommand,
  Client,
  StringUtils,
  CommandType,
  TimeUtils,
  resolveCooldownType,
  resolvePermLevel,
  PermissionUtils,
  UserContextCommand,
  MessageContextCommand,
  EmbedConstants,
} from '@core';
import CommandOption, {
  CommandAutoCompleteQueryType,
} from '../../auto-completes/command';

class EmbedResolver {
  static readonly commandEmbed = (client: Client, cmd: CommandType) => {
    const { cooldown } = cmd;
    const description =
      cmd instanceof ChatInputCommand ? cmd.data.description : 'n/a';
    const cooldownUsagesOutput =
      cooldown.usages === 1 ? '1 use' : `${cooldown.usages} uses`;
    const cooldownOutput = cooldown.enabled
      ? [
          `**${cooldownUsagesOutput}** in **${TimeUtils.humanReadableMs(cooldown.duration)}**`,
          `(type \`${resolveCooldownType(cooldown.type)}\`)`,
        ].join(' ')
      : 'n/a';

    const embed = client.embeds.info({
      title: `Command: ${cmd.data.name}`,
      description: `\`\`\`${description}\`\`\``,
      fields: [
        {
          name: '⏱️ Cooldown',
          value: cooldownOutput,
          inline: false,
        },

        {
          name: '🏷️ Aliases',
          value: `\`${
            cmd.aliases.length > 0 ? cmd.aliases.join('`, `') : 'None'
          }\``,
          inline: true,
        },
        {
          name: '#️⃣ Category',
          value: cmd.category ? StringUtils.titleCase(cmd.category) : 'None',
          inline: true,
        },
        {
          name: '🛡️ Permission Level',
          value: `${resolvePermLevel(cmd.permLevel)}`,
          inline: true,
        },

        {
          name: '🔞 NSFW',
          value: cmd.nsfw
            ? `${client.clientEmojis.success} Yes`
            : `${client.clientEmojis.error} No`,
          inline: true,
        },
        {
          name: '💬 DM',
          value: !cmd.guildOnly
            ? `${client.clientEmojis.success} Yes`
            : `${client.clientEmojis.error} No`,
          inline: true,
        },
        {
          name: '🔒 Ephemeral',
          value: cmd.isEphemeral
            ? `${client.clientEmojis.success} Yes`
            : `${client.clientEmojis.error} No`,
          inline: true,
        },
      ],
    });

    if (cmd.clientPerms.length > 0) {
      embed.addFields({
        name: '🔑 Client Permissions (me)',
        value: PermissionUtils.displayPermissions(cmd.clientPerms, '\n'),
        inline: true,
      });
    }

    if (cmd.userPerms.length > 0) {
      embed.addFields({
        name: '🔑 User Permissions (you)',
        value: PermissionUtils.displayPermissions(cmd.userPerms, '\n'),
        inline: true,
      });
    }

    return embed;
  };

  static readonly categoryEmbeds = async (
    client: Client,
    category: string,
    commands: Collection<string, CommandType>,
  ) => {
    const apiCommandData = await client.commandManager.commandAPIData();
    const allFields = commands
      .toJSON()
      .filter((e) => apiCommandData?.find((f) => f.name === e.data.name))
      .map((e) => {
        const apiCmd = apiCommandData?.find((f) => f.name === e.data.name);
        const isSubCmdGroupOnlyCmd =
          apiCmd?.options.length &&
          !apiCmd?.options.find(
            (e) =>
              e.type !== ApplicationCommandOptionType.SubcommandGroup &&
              e.type !== ApplicationCommandOptionType.Subcommand,
          );
        const optionsOutput =
          apiCmd && apiCmd.options.length > 0
            ? ` +${apiCmd.options.length} option${apiCmd.options.length === 1 ? '' : 's'}`
            : null;
        const aliasOutputStandalone =
          e.aliases.length > 0
            ? ` +${e.aliases.length} alias${e.aliases.length === 1 ? '' : 'es'}`
            : '';
        const aliasOutput = aliasOutputStandalone
          ? optionsOutput === null
            ? aliasOutputStandalone
            : `, ${aliasOutputStandalone}`
          : '';
        const nameOutput = apiCmd
          ? `</${apiCmd.name}:${apiCmd.id}>`
          : `/${e.data.name}`;
        const suffix = optionsOutput ?? '' + aliasOutput;
        const nameWithOptionsOutput = apiCmd
          ? `${apiCmd ? nameOutput : `${nameOutput}`}${isSubCmdGroupOnlyCmd ? ` - ${apiCmd.description}` : suffix.length ? `${suffix}` : ''}`
          : e.data.name;
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
            : e instanceof UserContextCommand
              ? "No description available for this command, as it's a user context menu command."
              : e instanceof MessageContextCommand
                ? "No description available for this command, as it's a message context menu command."
                : 'n/a';
        if (subCmdOnlyOutput) description += `\n${subCmdOnlyOutput.join('\n')}`;
        return {
          name: `${nameWithOptionsOutput}`,
          value: description,
          inline: false,
        };
      });
    const chunkSize = EmbedConstants.MAX_FIELDS_LENGTH;
    const embeds = [];
    for (let i = 0; i < allFields.length; i += chunkSize) {
      const fields = allFields.slice(i, i + chunkSize);
      const embed = client.embeds.info({
        title: `Category: ${StringUtils.titleCase(category)}`,
        description: `Commands in this category: ${commands.size}`,
        fields,
      });
      embeds.push(embed);
    }

    return embeds;
  };
}

const CommandsHelpCommand = new ChatInputCommand({
  isEphemeral: true,
  data: new SlashCommandBuilder().addStringOption(
    CommandOption.addOptionHandler,
  ),
  run: async (client, interaction) => {
    // Declarations
    const { member, guild } = interaction;
    const [group, name] = CommandOption.getRawValue(interaction).split('@');
    const isCategoryQuery = group === CommandAutoCompleteQueryType.CATEGORY;
    const queryOutput =
      typeof name === 'undefined' ? (group ?? '""') : `${name} (${group})`;

    let cmd: CommandType | null = null;
    if (group === CommandAutoCompleteQueryType.CATEGORY) {
      cmd =
        client.commandManager.apiCommands.find((c) => c.category === name) ??
        null;
    } else if (group === CommandAutoCompleteQueryType.SLASH) {
      cmd =
        client.commandManager.chatInput.find((c) => c.data.name === name) ??
        null;
    } else if (group === CommandAutoCompleteQueryType.USER_CONTEXT) {
      cmd =
        client.commandManager.userContextMenus.find(
          (c) => c.data.name === name,
        ) ?? null;
    } else if (group === CommandAutoCompleteQueryType.MESSAGE_CONTEXT) {
      cmd =
        client.commandManager.messageContextMenus.find(
          (c) => c.data.name === name,
        ) ?? null;
    }

    // Make sure an option was selected
    if (!cmd) {
      await CommandsHelpCommand.reply(
        interaction,
        client.embeds.error(
          Lang.t('commands:commands.noCmdForQuery', { query: queryOutput }),
        ),
      );
      return;
    }

    // Only include commands usable by the member
    const memberPermLevel = await PermissionUtils.resolveMemberPermissionLevel(
      client,
      member,
      guild,
    );
    const commands = client.commandManager.apiCommands.filter((c) =>
      client.commandManager.filterByPermLevel(c, member, memberPermLevel),
    );

    // Overview of Category
    if (isCategoryQuery) {
      const categoryCommands = commands.filter((c) => c.category === name);
      const embeds = await EmbedResolver.categoryEmbeds(
        client,
        name ?? '',
        categoryCommands,
      );
      await CommandsHelpCommand.reply(interaction, { embeds });
      return;
    }

    // Overview of selected command
    const embed = EmbedResolver.commandEmbed(client, cmd);
    await CommandsHelpCommand.reply(interaction, embed);
  },
});

export default CommandsHelpCommand;
