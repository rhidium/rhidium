import { ModerationAction } from '@prisma/client';
import {
  ChatInputCommand,
  Database,
  InputUtils,
  InteractionUtils,
  isAutoCompleteResponseType,
  PermLevel,
  UnitConstants,
} from '@core';
import { SlashCommandBuilder } from 'discord.js';
import AutoModerationActionOption from '../../auto-completes/auto-moderation-action';
import { ModerationServices } from '../../services/moderation';

const AutoModerationCommand = new ChatInputCommand({
  guildOnly: true,
  permLevel: PermLevel.Administrator,
  data: new SlashCommandBuilder()
    .setName('auto-moderation')
    .setDescription(
      'Configure auto-moderation action that are triggered on specific (warn) thresholds.',
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all auto-moderation actions.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a new auto-moderation action.')
        .addIntegerOption((option) =>
          option
            .setName('threshold')
            .setDescription(
              'The amount of warnings required to trigger this action.',
            )
            .setRequired(true)
            .setMinValue(1),
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('The action to take when the threshold is reached.')
            .setRequired(true)
            .setChoices(
              Object.entries(ModerationAction).map(([key, value]) => ({
                name: key,
                value,
              })),
            ),
        )
        .addStringOption((option) =>
          InputUtils.Duration.addOptionHandler(option, {
            required: false,
            name: 'duration',
            description:
              'How long to apply the action for, 0 or none for permanent. (max 1 year)',
            shortSuffix: false,
          }),
        )
        .addStringOption((option) =>
          InputUtils.Duration.addOptionHandler(option, {
            required: false,
            name: 'delete-messages-duration',
            description:
              'How far to go back when deleting messages for triggered actions (max 1 week).',
            shortSuffix: true,
          }),
        )
        .addBooleanOption((option) =>
          option
            .setName('once-per-member')
            .setDescription(
              'Whether this action should only be triggered once per member, true by default.',
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove an auto-moderation action.')
        .addStringOption(AutoModerationActionOption.addOptionHandler),
    ),
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    const { options, guild: discordGuild } = interaction;
    const subcommand = options.getSubcommand(true);

    const [guild] = await Promise.all([
      Database.Guild.resolve(discordGuild.id),
      interaction.deferReply(),
    ]);

    switch (subcommand) {
      case 'list': {
        const actions = guild.AutoModerationActions;

        if (!actions.length) {
          await interaction.editReply({
            embeds: [
              client.embeds.error(
                'No auto-moderation actions have been configured.',
              ),
            ],
          });
          return;
        }

        const actionList = actions.map(
          (action, index) =>
            `**${index + 1}.** ${ModerationServices.stringifyAutoModerationAction(
              action,
            )}`,
        );

        await interaction.editReply({
          embeds: [
            client.embeds.info({
              title: 'Auto-Moderation Actions',
              description: actionList.join('\n'),
            }),
          ],
        });

        break;
      }

      case 'add': {
        const threshold = options.getInteger('threshold', true);
        const action = options.getString('action', true) as ModerationAction;
        const _duration = options.getString('duration');
        const deleteMessagesDuration = options.getString(
          'delete-messages-duration',
        );
        const oncePerMember = options.getBoolean('once-per-member') ?? true;

        const usesDuration =
          typeof _duration === 'string' && _duration.length > 0;
        const durationAllowed = action.endsWith('_DURATION');
        const durationMs =
          usesDuration && durationAllowed
            ? InputUtils.Duration.inputToMs(
                _duration,
                UnitConstants.MS_IN_ONE_DAY * 365,
              )
            : null;
        const deleteMessageMs =
          deleteMessagesDuration === null
            ? null
            : InputUtils.Duration.inputToMs(
                deleteMessagesDuration,
                UnitConstants.MS_IN_ONE_DAY * 7,
              );

        if (usesDuration && !durationAllowed) {
          await interaction.editReply({
            embeds: [
              client.embeds.error(
                'You can only specify a duration for actions that are not permanent.',
              ),
            ],
          });
          return;
        }

        if (
          guild.AutoModerationActions.some(
            (a) => a.action === action && a.triggerThreshold === threshold,
          )
        ) {
          await interaction.editReply({
            embeds: [
              client.embeds.error(
                'An action with the same threshold and type/action already exists.',
              ),
            ],
          });
          return;
        }

        await Database.Guild.update({
          where: { id: guild.id },
          data: {
            AutoModerationActions: {
              create: {
                action,
                triggerThreshold: threshold,
                actionDurationMs: durationMs,
                deleteMessageSeconds:
                  deleteMessageMs === null
                    ? null
                    : deleteMessageMs / UnitConstants.MS_IN_ONE_SECOND,
                oncePerMember,
              },
            },
          },
        });

        await interaction.editReply({
          embeds: [
            client.embeds.success(
              'Successfully added the auto-moderation action.',
            ),
          ],
        });

        break;
      }

      case 'remove': {
        const action = await AutoModerationActionOption.getValue(
          interaction,
          true,
        );

        if (isAutoCompleteResponseType(action)) return;

        const stringifiedAction =
          ModerationServices.stringifyAutoModerationAction(action);

        void InputUtils.Confirmation.promptConfirmation({
          client,
          interaction,
          content: {
            content:
              'Are you sure you want to remove the auto-moderation action?',
            embeds: [
              client.embeds.info(
                `Are you sure you want to remove the auto-moderation action ${stringifiedAction}?`,
              ),
            ],
          },
          async onConfirm(i) {
            await i.deferUpdate();

            try {
              await Database.Guild.update({
                where: { id: guild.id },
                data: {
                  AutoModerationActions: {
                    delete: {
                      id: action.id,
                    },
                  },
                },
              });
            } catch (error) {
              client.logger.error(
                `Failed to remove auto-moderation action: ${error}`,
              );
              await i.editReply({
                embeds: [
                  client.embeds.error(
                    'Failed to remove the auto-moderation action, please try again later.',
                  ),
                ],
              });
              return;
            }

            await i.editReply({
              embeds: [
                client.embeds.success(
                  `Successfully removed the auto-moderation action ${stringifiedAction}.`,
                ),
              ],
              components: [],
            });
          },
        });

        break;
      }

      default: {
        client.logger.warn(`Unrecognized subcommand: ${subcommand}`);
        await interaction.editReply({
          embeds: [client.embeds.error('Unrecognized subcommand.')],
        });
        break;
      }
    }
  },
});

export default AutoModerationCommand;
