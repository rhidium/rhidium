import Client from '@core/client';
import { UnitConstants } from '@core/constants';
import {
  ActionRowBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  RepliableInteraction,
  StringSelectMenuBuilder,
} from 'discord.js';
import { StringUtils } from '../common';
import { EmojiUtils } from '../emojis';
import { InteractionUtils } from './interaction';
import { I18n } from '@core/i18n';

type PaginationType = 'button' | 'select';
type PaginationPage = BaseMessageOptions & {
  label?: string;
  emoji?: string;
  description?: string;
};
type PaginationOptions = {
  selectId?: string;
  type?: PaginationType;
  client: Client;
  pages: PaginationPage[];
  interaction: RepliableInteraction;
  duration?: number;
  defaultPage?: number;
  ephemeral?: boolean;
  handleResponses?: boolean;
};

class InteractionPagination {
  public static readonly paginator = async (_options: PaginationOptions) => {
    const {
      selectId: _selectId,
      type = 'button',
      client,
      pages,
      interaction,
      duration = UnitConstants.MS_IN_ONE_HOUR,
      defaultPage = 0,
      ephemeral,
      handleResponses = true,
    } = _options;

    const id = interaction.id;
    const selectId = _selectId ?? `@pagination:${id}:select`;
    const goToFirstId = `@pagination:${id}:first`;
    const goToPreviousId = `@pagination:${id}:previous`;
    const goToNextId = `@pagination:${id}:next`;
    const goToLastId = `@pagination:${id}:last`;
    const paginationIds = [
      selectId,
      goToFirstId,
      goToPreviousId,
      goToNextId,
      goToLastId,
    ];

    let pageNow = defaultPage;
    const componentType =
      type === 'button' ? ComponentType.Button : ComponentType.StringSelect;
    const isOnFirstPage = () => pageNow === 0;
    const isOnLastPage = () => pageNow === pages.length - 1;

    const controlRow = (forceDisable = false) => {
      if (type === 'button') {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(goToFirstId)
            .setDisabled(forceDisable || isOnFirstPage())
            .setLabel('First')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(goToPreviousId)
            .setDisabled(forceDisable || isOnFirstPage())
            .setLabel('Previous')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(goToNextId)
            .setDisabled(forceDisable || isOnLastPage())
            .setLabel('Next')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(goToLastId)
            .setDisabled(forceDisable || isOnLastPage())
            .setLabel('Last')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Primary),
        );
      }

      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(selectId)
          .setDisabled(forceDisable)
          .setMinValues(1)
          .setMaxValues(1)
          .setPlaceholder('Select a page')
          .addOptions(
            Array.from({ length: Math.min(pages.length, 25) }, (_, i) => {
              const page = pages[i];

              return {
                label: StringUtils.truncate(
                  page?.label ?? `Page ${i + 1}`,
                  100,
                ),
                value: `${i}`,
                default: i === pageNow,
                emoji: page?.emoji ?? EmojiUtils.emojify(`${i + 1}`),
                description: StringUtils.truncate(
                  page?.description ?? `Go to page ${i + 1}`,
                  100,
                ),
              };
            }),
          ),
      );
    };

    const paginator = async (page: number) => {
      const content = pages[page];
      if (!content) return null;

      return await interaction.editReply({
        ...content,
        components: [controlRow(), ...(content.components ?? [])],
      });
    };

    if (!InteractionUtils.isAcknowledged(interaction)) {
      await interaction.deferReply({
        flags: ephemeral ? [MessageFlags.Ephemeral] : undefined,
      });
    }

    const initialReply = await paginator(pageNow);

    if (!handleResponses) return;

    if (!initialReply) {
      void InteractionUtils.replyDynamic(interaction, {
        content: I18n.genericErrorDecline(interaction),
      });
      return;
    }

    const collector = initialReply.createMessageComponentCollector({
      componentType,
      time: duration,
      filter: (i) => paginationIds.includes(i.customId),
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        void InteractionUtils.replyDynamic(interaction, {
          content: client.Lang.t('core:permissions.unavailable.unauthorized'),
        });
        return;
      }

      await i.deferUpdate();

      if (i.customId === selectId && i.isStringSelectMenu()) {
        const selectedIdString = i.values[0];
        if (!selectedIdString) return;

        pageNow = parseInt(selectedIdString, 10);
        await paginator(pageNow);
      }

      if (i.customId === goToFirstId) {
        pageNow = 0;
        await paginator(pageNow);
      }

      if (i.customId === goToPreviousId) {
        if (pageNow === 0) pageNow = pages.length - 1;
        else pageNow--;
        await paginator(pageNow);
      }

      if (i.customId === goToNextId) {
        if (pageNow === pages.length - 1) pageNow = 0;
        else pageNow++;
        await paginator(pageNow);
      }

      if (i.customId === goToLastId) {
        pageNow = pages.length - 1;
        await paginator(pageNow);
      }
    });

    collector.on('end', async () => {
      await initialReply.edit({
        components: [controlRow(true)],
      });
    });
  };
}

export {
  InteractionPagination,
  type PaginationPage,
  type PaginationOptions,
  type PaginationType,
};
