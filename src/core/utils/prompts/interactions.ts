import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  Guild,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  ModalBuilder,
  ModalSubmitInteraction,
  RepliableInteraction,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction,
} from 'discord.js';
import type { GuildInteraction } from '@core/commands';
import type {
  AnyPromptValue,
  Prompt,
  PromptsResponse,
  ResolvedPrompt,
  ValueForPrompt,
} from './types';
import { PromptValidation } from './validation';
import { StringUtils } from '../common';
import { EmbedConstants, UnitConstants } from '@core/constants';
import { PromptResolver } from './resolver';
import { Logger } from '@core/logger';
import { Embeds } from '@core/config';

const isProduction = process.env.NODE_ENV === 'production';

type PromptInteraction = GuildInteraction<
  | UserSelectMenuInteraction<CacheType>
  | ChannelSelectMenuInteraction<CacheType>
  | RoleSelectMenuInteraction<CacheType>
  | StringSelectMenuInteraction<CacheType>
  | ButtonInteraction<CacheType>
  | ModalSubmitInteraction<CacheType>
  | ButtonInteraction<CacheType>
>;

type GenericInteractionOptions = InteractionReplyOptions &
  InteractionEditReplyOptions;

type PromptDeferOptions = {
  /** Should we defer the update to the interaction? Has priority over `deferReply`. */
  deferUpdate?: boolean;
  /** Should we defer the reply to the interaction? */
  deferReply?: boolean;
};

type PromptInteractionOptions<P extends Prompt> = {
  allowCancel?: boolean;
  contextTransformer?: (
    prompt: ResolvedPrompt<P>,
    arr: ResolvedPrompt<P>[],
    ind: number,
    collected: string[] | null,
    errorFeedbackFields: APIEmbedField[],
  ) => GenericInteractionOptions;
};

type HandlePromptInteractionOptions<P extends Prompt> =
  PromptInteractionOptions<P> & {
    onPromptError?: (
      error: Error,
      interaction: PromptInteraction,
      prompt: ResolvedPrompt<P>,
    ) => void;
    onFinish?: (
      promptValues: Record<string, ValueForPrompt<ResolvedPrompt<P>>>,
      interaction: PromptInteraction,
    ) => void;
  };

class PromptInteractionHandler {
  private constructor() {}

  public static readonly transformPromptValue = <P extends Prompt>(
    prompt: P,
    resolvedValue: string | string[] | null,
    guild: Guild,
  ): ValueForPrompt<P> => {
    const valueTransformer = <T>(
      value: string | string[] | null,
      transformer?: (value: string) => T,
      filter?: (transformedValue: T, ind: number, arr: T[]) => boolean,
    ): ValueForPrompt<P> => {
      const isResource = PromptValidation.isPromptWithResource(prompt);

      const castValue = (value: string | string[] | null | T | T[]) => {
        const idResolver = (_value: string | string[] | null | T | T[]) =>
          typeof _value === 'object' &&
          _value !== null &&
          'id' in _value &&
          typeof _value.id === 'string'
            ? _value.id
            : `${_value}`;

        if (isResource) {
          if (Array.isArray(value)) {
            return value.map(idResolver) as ValueForPrompt<P>;
          }

          return idResolver(value) as ValueForPrompt<P>;
        }

        return value as ValueForPrompt<P>;
      };

      if (value === null) {
        return castValue(null);
      }

      if (Array.isArray(value)) {
        if (!transformer) {
          return castValue(value);
        }

        return castValue(
          value
            .map(transformer)
            .filter((transformedValue, ind, arr) =>
              filter ? filter(transformedValue, ind, arr) : true,
            ),
        );
      }

      if (!transformer) {
        return castValue(value ?? null);
      }

      return castValue(transformer(value));
    };

    let transformed;

    switch (prompt.type) {
      case 'channel': {
        transformed = valueTransformer(
          resolvedValue,
          (value) => guild.channels.resolve(value),
          (transformedValue) => {
            if (transformedValue === null) {
              return false;
            }

            if (!PromptValidation.isPromptWithChannelTypes(prompt)) {
              return true;
            }

            return (
              PromptValidation.isPromptWithChannelTypes(prompt) &&
              prompt.channelTypes.includes(transformedValue.type)
            );
          },
        );
        break;
      }

      case 'role': {
        transformed = valueTransformer(
          resolvedValue,
          (value) => guild.roles.resolve(value),
          (transformedValue) => transformedValue !== null,
        );
        break;
      }

      case 'user': {
        transformed = valueTransformer(
          resolvedValue,
          (value) => guild.members.resolve(value),
          (transformedValue) => transformedValue !== null,
        );
        break;
      }

      case 'boolean': {
        transformed = valueTransformer(
          resolvedValue,
          (value) => value === 'true',
        );
        break;
      }

      case 'number': {
        transformed = valueTransformer(
          resolvedValue,
          (value) => Number(value),
          (transformedValue) => !Number.isNaN(transformedValue),
        );
        break;
      }

      case 'string':
      default: {
        transformed = valueTransformer(resolvedValue);
        break;
      }
    }

    return transformed;
  };

  public static readonly addCancelButton = (
    row: ActionRowBuilder<ButtonBuilder>,
  ) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('@cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌'),
    );
  };

  public static readonly promptInteraction = async <
    P extends Prompt,
    I extends RepliableInteraction | ModalSubmitInteraction,
  >(
    interaction: GuildInteraction<I>,
    prompt: ResolvedPrompt<P>,
    prompts: ResolvedPrompt<P>[],
    {
      allowCancel = prompts.length > 1,
      contextTransformer = PromptInteractionHandler.defaultContextTransformer,
      deferUpdate,
      deferReply,
    }: PromptDeferOptions & PromptInteractionOptions<P> = {},
  ) => {
    const collected: string[] = [];
    let hasCancelled = false;
    let shouldRefreshComponents = false;

    const minValues = !PromptValidation.isPromptWithMultiple(prompt)
      ? prompt.required
        ? 1
        : 0
      : 'minValues' in prompt && typeof prompt.minValues === 'number'
        ? prompt.minValues
        : 0;
    const _maxValues = !PromptValidation.isPromptWithMultiple(prompt)
      ? 1
      : 'maxValues' in prompt && typeof prompt.maxValues === 'number'
        ? prompt.maxValues
        : PromptValidation.isPromptWithChoices(prompt)
          ? prompt.choices.length
          : null;
    const maxValues = _maxValues !== null ? Math.min(_maxValues, 25) : null;

    const defaultValues = collected.length
      ? collected.map((c) => c.toString())
      : PromptValidation.isPromptWithDefaultValue(prompt) &&
          prompt.defaultValue !== null
        ? Array.isArray(prompt.defaultValue)
          ? prompt.defaultValue.map((e) => e.toString())
          : [prompt.defaultValue.toString()]
        : [];

    const safeDefaultValues =
      maxValues !== null && defaultValues.length > maxValues
        ? defaultValues.slice(0, maxValues)
        : defaultValues;

    collected.push(...safeDefaultValues);

    const shouldDisplayCollected = PromptValidation.isPromptWithMultiple(prompt)
      ? prompt.type === 'string' || prompt.type === 'number'
      : false;

    const selectMenuChoices: SelectMenuComponentOptionData[] | null =
      PromptValidation.isPromptWithChoices(prompt) && prompt.choices.length
        ? prompt.choices.map((choice) => ({
            label: choice.name,
            value: choice.value.toString(),
            default: PromptValidation.isPromptWithDefaultValue(prompt)
              ? Array.isArray(prompt.defaultValue)
                ? prompt.defaultValue
                    .map((e) => e.toString())
                    .includes(choice.value.toString())
                : prompt.defaultValue === choice.value
              : false,
          }))
        : null;
    const hasChoicesPagination =
      selectMenuChoices !== null && selectMenuChoices.length > 25;

    const getMaxPaginationValues = (page: number) => {
      const start = page * 23;
      const end = start + 23;
      const hasPreviousPage = page > 0;
      const hasNextPage = end < (selectMenuChoices?.length ?? 0);
      const elements = selectMenuChoices?.slice(start, end) ?? [];

      if (hasPreviousPage && hasNextPage) {
        return Math.min(elements.length + 2, 23);
      }

      return Math.min(elements.length + 1, 24);
    };

    const getChoicesPage = (page: number): SelectMenuComponentOptionData[] => {
      if (!hasChoicesPagination) {
        return selectMenuChoices ?? [];
      }

      const start = page * 23;
      const end = start + 23;
      const hasPreviousPage = page > 0;
      const hasNextPage = end < (selectMenuChoices?.length ?? 0);

      const options = [
        ...(hasChoicesPagination && hasPreviousPage
          ? [
              {
                label: 'Go to Previous Page',
                value: '@select-choices-previous',
                default: false,
                emoji: '⬅️',
              },
            ]
          : []),
        ...(selectMenuChoices?.slice(start, end) ?? []).map((e) => ({
          ...e,
          default: collected.includes(e.value),
        })),
        ...(hasChoicesPagination && hasNextPage
          ? [
              {
                label: 'Go to Next Page',
                value: '@select-choices-next',
                default: false,
                emoji: '➡️',
              },
            ]
          : []),
      ];

      return options;
    };

    const collect = async (
      currentChoicesPage: number,
      errorFeedbackFields?: APIEmbedField[],
    ) => {
      const promptOptions: GenericInteractionOptions = contextTransformer?.(
        prompt,
        prompts,
        prompts.indexOf(prompts.find((p) => p.id === prompt.id) ?? prompt),
        shouldDisplayCollected ? collected : null,
        errorFeedbackFields ?? [],
      ) ?? {
        content: prompt.message,
        embeds: errorFeedbackFields ? [{ fields: errorFeedbackFields }] : [],
      };

      let hasSkipButton = false;
      let cancelButtonAttached = false;

      if (
        PromptValidation.isPromptWithChoices(prompt) ||
        PromptValidation.isPromptWithResource(prompt)
      ) {
        let selectMenu:
          | UserSelectMenuBuilder
          | StringSelectMenuBuilder
          | ChannelSelectMenuBuilder
          | RoleSelectMenuBuilder;

        if (prompt.type === 'channel') {
          selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId(`@${prompt.id}`)
            .setDisabled(false);
        } else if (prompt.type === 'role') {
          selectMenu = new RoleSelectMenuBuilder()
            .setCustomId(`@${prompt.id}`)
            .setDisabled(false);
        } else if (prompt.type === 'user') {
          selectMenu = new UserSelectMenuBuilder()
            .setCustomId(`@${prompt.id}`)
            .setDisabled(false);
        } /* isPromptWithChoices */ else {
          selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`@${prompt.id}`)
            .setDisabled(false);
        }

        const resource =
          prompt.type === 'channel'
            ? 'channel'
            : prompt.type === 'role'
              ? 'role'
              : prompt.type === 'user'
                ? 'user'
                : 'option';

        const placeholderBase = PromptValidation.isPromptWithMultiple(prompt)
          ? maxValues !== null
            ? `Select between ${minValues} and ${maxValues} ${StringUtils.pluralize(resource, maxValues)}...`
            : `Select at least ${StringUtils.pluralize(resource, minValues)}...`
          : `Select a ${prompt.type}...`;

        selectMenu.setPlaceholder(placeholderBase);
        selectMenu.setMinValues(minValues);

        if (maxValues !== null) {
          selectMenu.setMaxValues(
            hasChoicesPagination
              ? getMaxPaginationValues(currentChoicesPage)
              : maxValues,
          );
        }

        if (collected.length > 0) {
          if ('setDefaultChannels' in selectMenu) {
            selectMenu.setDefaultChannels(collected);
          }
          if ('setDefaultRoles' in selectMenu) {
            selectMenu.setDefaultRoles(collected);
          }
          if ('setDefaultUsers' in selectMenu) {
            selectMenu.setDefaultUsers(collected);
          }
        } else {
          // If we have no collected values, we have to reset the select menu
          // on the interaction - otherwise, if the previous interaction had
          // a select menu of the same type, it would keep the previous values.
          const currentIndex = prompts.indexOf(
            prompts.find((p) => p.id === prompt.id) ?? prompt,
          );
          const previousPrompt = prompts[currentIndex - 1];
          if (previousPrompt && previousPrompt.type === prompt.type) {
            shouldRefreshComponents = true;
          }
        }

        if (
          selectMenuChoices !== null &&
          PromptValidation.isPromptWithChoices(prompt) &&
          'addOptions' in selectMenu
        ) {
          selectMenu.addOptions(getChoicesPage(currentChoicesPage));
        }

        if (
          PromptValidation.isPromptWithChannelTypes(prompt) &&
          'setChannelTypes' in selectMenu
        ) {
          selectMenu.setChannelTypes(prompt.channelTypes);
        }

        const components: ActionRowBuilder<
          | UserSelectMenuBuilder
          | StringSelectMenuBuilder
          | ChannelSelectMenuBuilder
          | RoleSelectMenuBuilder
          | ButtonBuilder
        >[] = [
          new ActionRowBuilder<
            | UserSelectMenuBuilder
            | StringSelectMenuBuilder
            | ChannelSelectMenuBuilder
            | RoleSelectMenuBuilder
          >().addComponents(selectMenu),
        ];

        hasSkipButton = PromptValidation.isPromptWithMultiple(prompt)
          ? collected.length >= minValues
          : !prompt.required || collected.length > 0;

        if (hasSkipButton) {
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`@${prompt.id}-skip`)
              .setLabel(prompts.length === 1 ? 'Done' : 'Skip')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⏭️'),
          );

          if (allowCancel && !cancelButtonAttached) {
            this.addCancelButton(row);
            cancelButtonAttached = true;
          }

          components.push(row);
        }

        promptOptions.components = components;
      } else {
        if (PromptValidation.isPromptWithMultiple(prompt)) {
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`@${prompt.id}-add`)
              .setLabel('Add Value')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(
                'maxValues' in prompt &&
                  typeof prompt.maxValues === 'number' &&
                  collected.length >= prompt.maxValues,
              )
              .setEmoji('➕'),
            new ButtonBuilder()
              .setCustomId(`@${prompt.id}-submit-values`)
              .setLabel('Submit')
              .setDisabled(
                !collected.length &&
                  (prompt.required === true ||
                    ('minValues' in prompt &&
                      typeof prompt.minValues === 'number' &&
                      prompt.minValues > 0)),
              )
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('✅'),
          );

          if (allowCancel && !cancelButtonAttached) {
            this.addCancelButton(row);
            cancelButtonAttached = true;
          }

          promptOptions.components = [row];
        } else if (prompt.type === 'boolean') {
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`@${prompt.id}-boolean-true`)
              .setLabel('Yes')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('✅'),
            new ButtonBuilder()
              .setCustomId(`@${prompt.id}-boolean-false`)
              .setLabel('No')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('❌'),
          );

          if (allowCancel && !cancelButtonAttached) {
            this.addCancelButton(row);
            cancelButtonAttached = true;
          }

          promptOptions.components = [row];
        } else {
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`@${prompt.id}-submit-value`)
              .setLabel('Submit Information')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('📝'),
          );

          if (allowCancel && !cancelButtonAttached) {
            this.addCancelButton(row);
            cancelButtonAttached = true;
          }

          promptOptions.components = [row];
        }
      }

      const replyFn =
        interaction.replied || interaction.deferred
          ? interaction.editReply.bind(interaction)
          : interaction.reply.bind(interaction);

      let msg = await replyFn(
        shouldRefreshComponents
          ? {
              ...promptOptions,
              components: [],
            }
          : promptOptions,
      );

      if (shouldRefreshComponents) {
        msg = await interaction.editReply({
          ...promptOptions,
          components: promptOptions.components,
        });
      }

      const componentCollector = msg.createMessageComponentCollector({
        time: UnitConstants.MS_IN_ONE_MINUTE * 14,
        filter: (i) =>
          i.customId === `@${prompt.id}` ||
          i.customId === `@${prompt.id}-add` ||
          i.customId === `@${prompt.id}-submit-value` ||
          i.customId === `@${prompt.id}-submit-values` ||
          i.customId === `@${prompt.id}-skip` ||
          i.customId === `@${prompt.id}-boolean-true` ||
          i.customId === `@${prompt.id}-boolean-false` ||
          i.customId === '@cancel',
      });

      return new Promise<PromptInteraction>((resolve, reject) => {
        componentCollector.on('collect', async (i) => {
          let response: PromptInteraction = i as PromptInteraction;
          const customId = response.customId;

          if (!response) {
            componentCollector.stop();
            reject(new Error('Prompt timed out.'));
            return;
          }

          const runDefer = async () => {
            if (deferUpdate) await response.deferUpdate();
            else if (deferReply) await response.deferReply();
          };

          if (selectMenuChoices !== null && response.isStringSelectMenu()) {
            const values = response.values.filter(
              (v) =>
                v !== '@select-choices-previous' &&
                v !== '@select-choices-next',
            );
            const currPage = getChoicesPage(currentChoicesPage);

            const selected = values.filter(
              (v) =>
                currPage.map((c) => c.value).includes(v) &&
                !collected.includes(v),
            );
            if (selected.length > 0) {
              collected.push(...selected);
            }

            const unselected = currPage
              .filter(
                (c) =>
                  collected.includes(c.value) &&
                  !values.includes(c.value) &&
                  !selected.includes(c.value),
              )
              .map((c) => c.value);
            if (unselected.length > 0) {
              collected.splice(
                0,
                collected.length,
                ...collected.filter((c) => !unselected.includes(c)),
              );
            }

            if (response.values.includes('@select-choices-previous')) {
              currentChoicesPage -= 1;

              await runDefer();

              componentCollector.stop();

              resolve(await collect(currentChoicesPage));

              return;
            } else if (response.values.includes('@select-choices-next')) {
              currentChoicesPage += 1;

              await runDefer();

              componentCollector.stop();

              resolve(await collect(currentChoicesPage));

              return;
            }
          }

          if (response.isButton()) {
            if (customId === '@cancel') {
              hasCancelled = true;

              await runDefer();

              componentCollector.stop();

              resolve(response as GuildInteraction<typeof response>);

              return;
            }

            if (
              customId === `@${prompt.id}-boolean-true` ||
              customId === `@${prompt.id}-boolean-false`
            ) {
              const value = customId === `@${prompt.id}-boolean-true`;

              collected.splice(0, collected.length, value.toString());

              await runDefer();

              componentCollector.stop();

              resolve(response as GuildInteraction<typeof response>);

              return;
            }

            if (
              customId === `@${prompt.id}-add` ||
              customId === `@${prompt.id}-submit-value`
            ) {
              const input = new TextInputBuilder()
                .setCustomId(`@${prompt.id}-input`)
                .setLabel(StringUtils.truncate(prompt.name, 45))
                .setPlaceholder(StringUtils.truncate(prompt.message, 100))
                .setRequired(prompt.required)
                .setStyle(TextInputStyle.Short);

              const minLength = PromptResolver.resolveMinLength(prompt);
              const maxLength = PromptResolver.resolveMaxLength(prompt);

              if (typeof minLength === 'number') {
                input.setMinLength(minLength);
              }

              if (typeof maxLength === 'number') {
                input.setMaxLength(maxLength);
              }

              if (
                PromptValidation.isPromptWithDefaultValue(prompt) &&
                prompt.defaultValue !== null
              ) {
                input.setValue(
                  Array.isArray(prompt.defaultValue)
                    ? (prompt.defaultValue.at(0)?.toString() ?? '')
                    : prompt.defaultValue.toString(),
                );
              }

              await response.showModal(
                new ModalBuilder()
                  .setCustomId(`@${prompt.id}`)
                  .setTitle('Submit Information')
                  .setComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      input,
                    ),
                  ),
              );

              try {
                response = (await response.awaitModalSubmit({
                  time: UnitConstants.MS_IN_ONE_MINUTE * 14,
                  filter: (interaction) =>
                    interaction.customId === `@${prompt.id}`,
                })) as GuildInteraction<ModalSubmitInteraction>;
              } catch {
                componentCollector.stop();
                reject(new Error('Prompt timed out.'));
                return;
              }
            }
          }

          await runDefer();

          if (
            (customId === `@${prompt.id}-add` ||
              customId === `@${prompt.id}-submit-value`) &&
            response.isModalSubmit()
          ) {
            const input = response.fields.getField(`@${prompt.id}-input`).value;

            if (prompt.type === 'number') {
              try {
                PromptValidation.validateConstraints(
                  prompt,
                  (PromptValidation.isPromptWithMultiple(prompt)
                    ? [Number(input)]
                    : Number(input)) as ValueForPrompt<ResolvedPrompt<P>>,
                );
              } catch (error) {
                componentCollector.stop();
                resolve(
                  await collect(currentChoicesPage, [
                    {
                      name: 'Invalid information provided, please try again.',
                      value:
                        error instanceof Error
                          ? error.message
                          : 'Unknown error.',
                    },
                  ]),
                );
                return;
              }
            }

            if (customId === `@${prompt.id}-add`) {
              collected.push(input);

              resolve(await collect(currentChoicesPage));
            }
          }

          componentCollector.stop();

          resolve(response as GuildInteraction<PromptInteraction>);

          return;
        });
      });
    };

    return [await collect(0), hasCancelled ? 'CANCELLED' : collected] as const;
  };

  public static readonly handlePromptCollector = async <P extends Prompt>(
    prompt: ResolvedPrompt<P>,
    response: PromptInteraction,
    collected: AnyPromptValue,
  ): Promise<ValueForPrompt<ResolvedPrompt<P>>> => {
    const workingCollected = response.isAnySelectMenu()
      ? PromptValidation.isPromptWithChoices(prompt) &&
        prompt.choices.length > 25
        ? collected // If choices with pagination, use selected values
        : response.values.filter(
            (e) =>
              e !== '@select-choices-previous' && e !== '@select-choices-next',
          ) // If we're working with a select menu, it's values are always final
      : response.isModalSubmit() // If we're working with a modal, we use the input field
        ? [response.fields.getField(`@${prompt.id}-input`).value]
        : collected; // Otherwise, we use our collected values

    if (
      // Check if value has been unset/removed
      Array.isArray(collected) &&
      Array.isArray(workingCollected) &&
      collected.length > 0 &&
      workingCollected.length === 0
    ) {
      return (
        PromptValidation.isPromptWithMultiple(prompt) ? [] : null
      ) as ValueForPrompt<ResolvedPrompt<P>>;
    }

    const resolvedCollected = [
      ...new Set(
        Array.isArray(workingCollected) ? workingCollected : [workingCollected],
      ),
    ];

    const resolvedValue = PromptValidation.isPromptWithMultiple(prompt)
      ? resolvedCollected.filter((c) => c !== null).map((c) => c.toString())
      : (resolvedCollected[0]?.toString() ?? null);

    const transformed = this.transformPromptValue(
      prompt,
      resolvedValue,
      response.guild,
    );

    return PromptValidation.validateConstraints<ResolvedPrompt<P>>(
      prompt,
      transformed,
    );
  };

  public static readonly handlePromptInteraction = async <P extends Prompt>(
    interaction: GuildInteraction<RepliableInteraction>,
    prompts: (P & {
      /**
       * Value is of type `any` because {@link Prompt Prompt[]} is generic,
       * use {@link MappedPrompt mapped prompts} to implement type-safe
       * `onCollect` functions.
       * @param value Generic value for the prompt.
       * @returns Nothing, promises are awaited, but the return type is ignored.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCollect?: (value: any) => void | Promise<void>;
      defaultValue?:
        | ValueForPrompt<ResolvedPrompt<P>>
        | ((
            guild: Guild,
          ) =>
            | ValueForPrompt<ResolvedPrompt<P>>
            | Promise<ValueForPrompt<ResolvedPrompt<P>>>);
    })[],
    options?: HandlePromptInteractionOptions<P>,
  ): Promise<PromptsResponse<P>> => {
    const {
      allowCancel = prompts.length > 1,
      onPromptError = PromptInteractionHandler.defaultOnErrorHandler,
      contextTransformer = PromptInteractionHandler.defaultContextTransformer,
      onFinish,
    } = options ?? {};

    const resolvedPrompts = prompts.map(PromptResolver.resolvePrompt);
    const promptValues: Record<string, ValueForPrompt<ResolvedPrompt<P>>> = {};

    for await (const prompt of resolvedPrompts) {
      const isLastPrompt =
        resolvedPrompts.indexOf(
          resolvedPrompts.find((p) => p.id === prompt.id) ?? prompt,
        ) ===
        resolvedPrompts.length - 1;
      const defaultValue =
        typeof prompt.defaultValue === 'function'
          ? await prompt.defaultValue(interaction.guild)
          : prompt.defaultValue;
      const promptWithDefault = { ...prompt, defaultValue };

      const [i, collected] = await this.promptInteraction(
        interaction,
        promptWithDefault,
        resolvedPrompts,
        {
          allowCancel,
          contextTransformer,
          deferUpdate: !isLastPrompt || typeof onFinish === 'function',
          deferReply: isLastPrompt && !onFinish,
        },
      );

      const done = async () => {
        if (onFinish) {
          onFinish(promptValues, i);
        } else {
          await Promise.all([
            i.message?.delete(),
            i.editReply({
              content: '',
              embeds: [],
              components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder()
                    .setCustomId('@finish')
                    .setLabel('All Done')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
                    .setEmoji('✅'),
                ),
              ],
            }),
          ]);
        }
      };

      if (collected === 'CANCELLED') {
        await done();

        return promptValues;
      }

      try {
        promptValues[prompt.id] = await this.handlePromptCollector(
          promptWithDefault,
          i,
          collected,
        );
      } catch (error) {
        if (onPromptError) {
          onPromptError(
            error instanceof Error ? error : new Error(`${error}`),
            i,
            promptWithDefault,
          );
        } else {
          throw error;
        }
      }

      if (prompt.onCollect) {
        await prompt.onCollect(promptValues[prompt.id]);
      }

      if (isLastPrompt) {
        await done();
      }
    }

    return promptValues;
  };

  public static readonly defaultOnErrorHandler = async (
    error: Error,
    i: PromptInteraction,
    prompt: ResolvedPrompt<Prompt>,
  ): Promise<void> => {
    Logger.error(error);
    const ctx = {
      embeds: [
        Embeds.error({
          title: 'Something went wrong',
          description: error.message,
          fields: isProduction
            ? []
            : [
                {
                  name: 'Prompt',
                  value:
                    '```json\n' +
                    StringUtils.truncate(
                      JSON.stringify(prompt, null, 2),
                      EmbedConstants.FIELD_VALUE_MAX_LENGTH - 25,
                    ) +
                    '\n```',
                  inline: true,
                },
                {
                  name: 'Stack Trace',
                  value:
                    '```js\n' +
                    StringUtils.truncate(
                      error.stack ?? 'No stack trace available',
                      EmbedConstants.FIELD_VALUE_MAX_LENGTH - 25,
                    ) +
                    '\n```',
                  inline: true,
                },
              ],
        }),
      ],
    };

    if (i.replied || i.deferred) await i.editReply(ctx);
    else await i.reply(ctx);
  };

  public static readonly defaultContextTransformer = (
    prompt: ResolvedPrompt<Prompt>,
    arr: ResolvedPrompt<Prompt>[],
    ind: number,
    collected: string[] | null,
    errorFeedbackFields: APIEmbedField[],
  ): GenericInteractionOptions => {
    const isLast = ind === arr.length - 1;
    const remaining = arr.length - ind - 1;
    const collectedSliced = (collected?.slice(-10) ?? []).reverse();

    const displayValue = (value: string) => {
      switch (prompt.type) {
        case 'number':
          return '- `' + Number(value).toLocaleString() + '`';
        case 'boolean':
          return '- ' + (value === 'true' ? 'Yes' : 'No');
        case 'channel':
          return `- <#${value}>`;
        case 'role':
          return `- <@&${value}>`;
        case 'user':
          return `- <@${value}>`;
        case 'string':
        default:
          return value;
      }
    };

    const collectedString = `${collectedSliced
      .map((c) => StringUtils.truncate(c, 100))
      .map(displayValue)
      .join('\n')}${
      (collected?.length ?? 0) > 10
        ? `\n... and ${collected!.length - 10} more`
        : ''
    }`;

    const embedFn = errorFeedbackFields.length ? Embeds.error : Embeds.info;

    return {
      content: !isLast
        ? `Question **${ind + 1}** of **${arr.length}**, ${remaining} more question${
            remaining === 1 ? '' : 's'
          } after this`
        : arr.length === 1
          ? ''
          : 'Last question',
      embeds: [
        embedFn({
          title: prompt.name,
          description: prompt.message,
          fields:
            collected === null || !collected.length
              ? [...errorFeedbackFields]
              : [
                  ...errorFeedbackFields,
                  {
                    name: 'You have provided the following values so far:',
                    value: collectedString,
                    inline: false,
                  },
                ],
        }),
      ],
    };
  };
}

export {
  PromptInteractionHandler,
  type PromptInteraction,
  type GenericInteractionOptions,
  type PromptDeferOptions,
  type PromptInteractionOptions,
  type HandlePromptInteractionOptions,
};
