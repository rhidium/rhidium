import { Command } from '@client/commands/base';
import { CommandType } from '@client/commands/types';
import { Embeds } from '@client/config';
import { Logger } from '@client/logger';
import { PermLevel } from '@client/permissions';
import { PermissionFlagsBits } from 'discord.js';

const TestChatInput = new Command({
  type: CommandType.ChatInput,
  permissions: {
    level: PermLevel.Developer,
    client: [PermissionFlagsBits.SendMessages],
    user: [PermissionFlagsBits.ViewAuditLog],
    whitelist: {
      guilds: ['1148585850007994388'],
      categories: ['1222669266113921116'],
      channels: ['1182012252715499591'],
      users: ['1148597817498140774'],
      roles: ['1222898693498470502'],
    },
  },
  enabled: {
    global: true,
    guildOnly: true,
    guilds: ['1148585850007994388'],
  },
  interactions: {
    replyEphemeral: true,
    refuseUncached: true,
  },
  data: (builder) =>
    builder
      .setName('test')
      .setDescription('Test command')
      .addSubcommandGroup((group) =>
        group
          .setName('group')
          .setDescription('Test subcommand group')
          .addSubcommand((subcommand) =>
            subcommand
              .setName('subcommand')
              .setDescription('Test subcommand')
              .addStringOption((option) =>
                option
                  .setName('string')
                  .setDescription('Test string option')
                  .setRequired(true),
              ),
          ),
      ),
  controllers: {
    group: {
      subcommand: async (client, interaction) => {
        Logger.debug(
          client.user.username,
          TestChatInput.data.name,
          TestChatInput.permissions.whitelist.guilds,
        );

        await TestChatInput.reply(interaction, Embeds.primary('Test command'));

        Logger.debug(interaction.inGuild());

        interaction.guild;
        if (interaction.inGuild() && interaction.inCachedGuild()) {
          interaction.guild.afkChannel;
          interaction.channel;
        }
        if (!interaction.inGuild()) {
          // interaction.channel;
        }

        return ['TEST'] as const;
      },
    },
  },
  async run(_client, interaction) {
    await TestChatInput.reply(
      interaction,
      Embeds.primary('Unknown (sub)command, please try again'),
    );

    return ['TEST'] as const;
  },
});

export default TestChatInput;
