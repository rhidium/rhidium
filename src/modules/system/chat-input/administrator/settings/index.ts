import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js';
import { handleSettingsUpdate, settingsEmbed } from './shared';
import {
  groupedSettingsChoices,
  groupedSettingsPrompts,
  hasShortSetup,
  resettableSettingsChoices,
  settingsAllRequired,
  settingsPrompts,
} from './prompts';
import { InputUtils, PromptDisplay, PromptValidation } from '@core/utils';
import {
  AuditLogType,
  Database,
  type PopulatedGuild,
  prismaClient,
} from '@core/database';
import { Command, CommandType, Permissions, PermLevel } from '@core/commands';
import { Embeds } from '@core/config';

PromptValidation.validatePrompts(settingsPrompts);

const useUpdateSubcommand = false;

const updateGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('update')
  .setDescription('Update server settings by category or individual setting.');

for (const prompt of settingsPrompts) {
  updateGroup.addSubcommand((subcommand) =>
    subcommand
      .setName(prompt.id)
      .setDescription(prompt.message ?? `Update the ${prompt.name} setting.`),
  );
}

const setupSubcommand = new SlashCommandSubcommandBuilder()
  .setName('set-up')
  .setDescription('Set up server settings.');

if (hasShortSetup) {
  setupSubcommand.addBooleanOption((option) =>
    option
      .setName('complete')
      .setDescription(
        'Set up all settings at once, instead of only required ones.',
      )
      .setRequired(false),
  );
}

const commandData = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Configure server settings.')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('display')
      .setDescription('Display current settings.')
      .addStringOption((option) =>
        option
          .setName('category')
          .setDescription(
            'The category of settings to display. Leave blank to display all.',
          )
          .setRequired(false)
          .addChoices(groupedSettingsChoices),
      ),
  )
  .addSubcommand(setupSubcommand)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('reset')
      .setDescription(
        'Reset a server setting to its default value. Leave blank to reset all.',
      )
      .addStringOption((option) =>
        option
          .setName('setting')
          .setDescription('The setting to reset.')
          .setRequired(false)
          .addChoices(resettableSettingsChoices),
      )
      .addBooleanOption((option) =>
        option
          .setName('delete-all-data')
          .setDescription(
            "Delete all data associated with this server and it's members.",
          )
          .setRequired(false),
      ),
  );

if (useUpdateSubcommand) {
  commandData.addSubcommandGroup(updateGroup);
}

const deleteAllGuildData = async (guild: PopulatedGuild) => {
  const warningsDeleted = await prismaClient.warning.deleteMany({
    where: {
      OR: [{ MemberGuildId: guild.id }, { IssuedByGuildId: guild.id }],
    },
  });

  const [
    membersDeleted,
    autoModerationActionsDeleted,
    severityConfigurationsDeleted,
    auditLogsDeleted,
    embedsDeleted,
  ] = await Promise.all([
    prismaClient.member.deleteMany({
      where: {
        GuildId: guild.id,
      },
    }),
    prismaClient.autoModerationAction.deleteMany({
      where: {
        GuildId: guild.id,
      },
    }),
    prismaClient.severityConfiguration.deleteMany({
      where: {
        GuildId: guild.id,
      },
    }),
    prismaClient.auditLog.deleteMany({
      where: {
        GuildId: guild.id,
      },
    }),
    prismaClient.embedField
      .deleteMany({
        where: {
          Embed: {
            GuildId: guild.id,
          },
        },
      })
      .then(() =>
        prismaClient.embed.deleteMany({
          where: {
            GuildId: guild.id,
          },
        }),
      ),
  ]);

  await Database.Guild.delete({ id: guild.id });

  await Promise.all([
    prismaClient.guildCaseCounter.deleteMany({
      where: {
        GuildId: guild.id,
      },
    }),
  ]);

  return {
    guild: 1,
    members: membersDeleted.count,
    warnings: warningsDeleted.count,
    embeds: embedsDeleted.count,
    'audit-logs': auditLogsDeleted.count,
    'auto-moderation-actions': autoModerationActionsDeleted.count,
    'severity-configurations': severityConfigurationsDeleted.count,
  };
};

const SettingsCommand = new Command({
  type: CommandType.ChatInput,
  enabled: {
    guildOnly: true,
  },
  permissions: {
    level: PermLevel.Administrator,
  },
  interactions: {
    replyEphemeral: true,
    deferReply: true,
    refuseUncached: true,
  },
  data: commandData,
  category: 'Administrator',
  run: async ({ client, interaction }) => {
    const { options } = interaction;
    const subcommandGroup = options.getSubcommandGroup(false);
    const subcommand = options.getSubcommand(true);

    if (subcommandGroup === 'update' || subcommand === 'set-up') {
      const completeSetup =
        subcommand === 'set-up' && options.getBoolean('complete', false);
      const isShortSetup =
        typeof completeSetup === 'boolean'
          ? completeSetup === false
          : !settingsAllRequired;
      const setting = subcommand === 'set-up' ? null : subcommand;

      await handleSettingsUpdate(client, interaction, isShortSetup, setting);

      return;
    }

    switch (subcommand) {
      case 'reset': {
        const deleteAllData =
          options.getBoolean('delete-all-data', false) ?? false;
        const settingsAccessor = options.getString('setting', false);

        if ((deleteAllData || !settingsAccessor) && interaction.guild.ownerId) {
          const memberPermLevel = await Permissions.resolveForMember(
            interaction.member,
            interaction.guild,
          );

          if (memberPermLevel < PermLevel['Server Owner']) {
            await SettingsCommand.reply(interaction, {
              embeds: [
                Embeds.error({
                  title: 'Invalid Permissions',
                  description:
                    "Only this server's owner can reset all settings. " +
                    'Please contact them if you need to reset all settings.',
                }),
              ],
            });
            return;
          }
        }

        const prompts = settingsPrompts.filter(
          (prompt) =>
            (!settingsAccessor || prompt.accessor === settingsAccessor) &&
            typeof prompt.defaultValue !== 'undefined',
        );

        if (!deleteAllData && !prompts.length) {
          await SettingsCommand.reply(interaction, {
            embeds: [
              Embeds.error({
                title: 'Invalid Setting',
                description: 'The setting you provided is not resettable.',
              }),
            ],
          });
          return;
        }

        const defaultValues = prompts.map((prompt) => [
          prompt.accessor,
          prompt.defaultValue,
        ]);

        const resolvedDefaults = Object.fromEntries(
          await Promise.all(
            defaultValues.map(async ([accessor, defaultValue]) => [
              accessor,
              typeof defaultValue === 'function'
                ? defaultValue(interaction.guild)
                : defaultValue,
            ]),
          ).then((values) =>
            values
              .filter(([, value]) => typeof value !== 'undefined')
              .map(([accessor, value]) => [
                accessor,
                Array.isArray(value) ? { set: value } : value,
              ]),
          ),
        );

        const [guildBefore] = await Promise.all([
          Database.Guild.resolve(interaction.guildId),
        ]);

        // Await confirmation
        await InputUtils.Confirmation.promptConfirmation({
          interaction,
          content: {
            embeds: [
              Embeds.warning({
                title: deleteAllData
                  ? 'Delete All Server Data'
                  : prompts.length === 1
                    ? `Reset ${prompts[0]!.name} Setting`
                    : 'Reset Settings',
                description: deleteAllData
                  ? 'Are you sure you want to **__delete all server data__**? This action cannot be undone.'
                  : prompts.length === 1
                    ? `Are you sure you want to reset the **\`${prompts[0]!.name}\`** setting to its default value?`
                    : 'Are you sure you want to **__reset all settings__** to their default values?',
              }),
            ],
          },
          onConfirm: async (i) => {
            if (deleteAllData) {
              await deleteAllGuildData(guildBefore).then(
                async (deletedData) => {
                  void Database.AuditLog.util({
                    client,
                    guild: guildBefore,
                    type: AuditLogType.GUILD_DATA_DELETED,
                    user: interaction.user.id,
                    data: {
                      deleted: deletedData,
                    },
                  });

                  await i.deferUpdate();
                  await i.editReply({
                    embeds: [
                      Embeds.success({
                        title: 'Server Data Deleted',
                        description:
                          'All server data and settings have been deleted. Please see below for an overview of deleted records.',
                        fields: Object.entries(deletedData).map(
                          ([key, value]) => ({
                            name: key,
                            value: value.toLocaleString(),
                          }),
                        ),
                      }),
                    ],
                  });
                },
              );
            } else {
              await Database.Guild.update({
                where: { id: interaction.guildId },
                data: {
                  ...resolvedDefaults,
                  SeverityConfiguration: {
                    delete: {
                      GuildId: interaction.guildId,
                    },
                  },
                },
              }).then(async (updatedGuild) => {
                void Database.AuditLog.util({
                  client,
                  guild: updatedGuild,
                  type: AuditLogType.GUILD_SETTINGS_RESET,
                  user: interaction.user.id,
                  data: {
                    before: guildBefore,
                    after: updatedGuild,
                  },
                });

                await i.deferUpdate();
                await settingsEmbed(
                  i,
                  updatedGuild,
                  prompts.length === 1
                    ? PromptDisplay.getCategoryIndex(
                        prompts[0]!,
                        groupedSettingsPrompts,
                      )
                    : 0,
                );
              });
            }
          },
        });

        break;
      }

      case 'display':
      default: {
        const categoryIndStr = options.getString('category', false);

        const [guild] = await Promise.all([
          Database.Guild.resolve(interaction.guildId),
        ]);

        if (!categoryIndStr) {
          await settingsEmbed(interaction, guild);
        } else {
          await settingsEmbed(interaction, guild, parseInt(categoryIndStr));
        }

        break;
      }
    }
  },
});

export default SettingsCommand;
