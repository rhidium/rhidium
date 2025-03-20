import {
  ActionRowBuilder,
  RepliableInteraction,
  CacheType,
  ChannelType,
  CommandInteractionOption,
  ComponentType,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Role,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
  Guild,
} from 'discord.js';
import { UnitConstants } from '../constants';
import { AvailableGuildInteraction } from '../commands';
import { ArrayUtils, StringUtils } from './common';

type PromptInteraction = AvailableGuildInteraction<
  | StringSelectMenuInteraction<CacheType>
  | ButtonInteraction<CacheType>
  | ModalSubmitInteraction<CacheType>
>;

type GenericInteractionOptions = InteractionReplyOptions &
  InteractionEditReplyOptions;

type PromptType = 'string' | 'number' | 'boolean' | 'channel' | 'role';

type PromptChoice<Value = string> = { name: string; value: Value };

type PromptBase = {
  id: string;
  type: PromptType;
  name: string;
  message: string;
  required: boolean;
};

type PromptWithChoices = PromptBase & {
  type: 'string' | 'number' | 'channel' | 'role';
  choices: PromptChoice[];
};

type PromptWithChannelTypes = PromptBase & {
  type: 'channel';
  channelTypes: ChannelType[];
};

type PromptWithMultiple = PromptBase & {
  multiple: true;
  minValues?: number;
  maxValues?: number;
};

type PromptWithMultipleChoices = PromptBase & {
  type: 'string' | 'number' | 'channel' | 'role';
  multiple: true;
  minValues?: number;
  maxValues?: number;
  choices: PromptChoice[];
};

type PromptWithDefaultValue = PromptBase & {
  type: 'string' | 'number' | 'boolean';
};

/**
 * Provides min/max validation for string and number prompts.
 *
 * - If {@link PromptWithChoices `choices`} are used, `minLength` and `maxLength` are resolved dynamically.
 * - If type is `channel` or `role`, snowflake validation is automatically applied.
 */
type PromptWithMinMax = PromptBase &
  (
    | {
        type: 'string';
        minLength?: number;
        maxLength?: number;
        choices?: never;
      }
    | {
        type: 'number';
        minValue?: number;
        maxValue?: number;
        choices?: never;
      }
  );

type Prompt =
  | PromptBase
  | PromptWithMultiple
  | PromptWithChoices
  | PromptWithChannelTypes
  | PromptWithMinMax
  | PromptWithMultipleChoices
  | PromptWithDefaultValue;

type MappedPrompt<
  Type extends PromptType,
  Required extends boolean,
  Multiple extends boolean,
  ResolveResources extends boolean = false,
  CType extends ChannelType = ChannelType,
> = Prompt & {
  type: Type;
  required: Required;
  multiple: Multiple;
  choices?: PromptChoice<
    PromptValue<Required, Type, false, ResolveResources, CType>
  >[];
  defaultValue?: PromptValue<Required, Type, Multiple, ResolveResources, CType>;
};

type MappedPrompts<
  ResolveResources extends boolean = false,
  CType extends ChannelType = ChannelType,
> = {
  [T in PromptType]:
    | MappedPrompt<T, true, true, ResolveResources, CType>
    | MappedPrompt<T, true, false, ResolveResources, CType>
    | MappedPrompt<T, false, true, ResolveResources, CType>
    | MappedPrompt<T, false, false, ResolveResources, CType>;
};

type Prompts = {
  [K in keyof MappedPrompts]: MappedPrompts[K];
}[keyof MappedPrompts][];

type SinglePromptValue<
  Type extends PromptType,
  ResolveResources extends boolean = false,
  CType extends ChannelType = ChannelType,
> = Type extends 'string'
  ? string
  : Type extends 'number'
    ? number
    : Type extends 'boolean'
      ? boolean
      : Type extends 'channel'
        ? ResolveResources extends true
          ? Extract<
              NonNullable<CommandInteractionOption<CacheType>['channel']>,
              {
                type: CType extends
                  | ChannelType.PublicThread
                  | ChannelType.AnnouncementThread
                  ? ChannelType.PublicThread | ChannelType.AnnouncementThread
                  : CType;
              }
            >
          : string
        : Type extends 'role'
          ? ResolveResources extends true
            ? Role
            : string
          : never;

type PromptValueResolver<
  Type extends PromptType,
  Multiple extends boolean,
  ResolveResources extends boolean = false,
  CType extends ChannelType = ChannelType,
> = Multiple extends true
  ? SinglePromptValue<Type, ResolveResources, CType>[]
  : SinglePromptValue<Type, ResolveResources, CType>;

type PromptValue<
  Required extends boolean,
  Type extends PromptType,
  Multiple extends boolean,
  ResolveResources extends boolean = false,
  CType extends ChannelType = ChannelType,
> = Required extends true
  ? PromptValueResolver<Type, Multiple, ResolveResources, CType>
  : PromptValueResolver<Type, Multiple, ResolveResources, CType> | null;

type ValueForPrompt<
  P extends Prompt,
  ResolveResources extends boolean = false,
> = P extends {
  required: infer R;
  type: infer T extends PromptType;
  multiple?: infer M;
}
  ? PromptValue<
      R extends true ? true : false,
      T,
      M extends true ? true : false,
      ResolveResources
    >
  : never;

type PromptWithUnknownChoices = Omit<PromptWithChoices, 'choices'> & {
  choices: PromptChoice<string | number>[];
};

class PromptUtils {
  private constructor() {}

  public static readonly isPromptBase = (
    prompt: Prompt,
  ): prompt is PromptBase => {
    return (
      !PromptUtils.isPromptWithChoices(prompt) &&
      !PromptUtils.isPromptWithChannelTypes(prompt) &&
      !PromptUtils.isPromptWithMultiple(prompt) &&
      !PromptUtils.isPromptWithMinMax(prompt) &&
      !PromptUtils.isPromptWithMultipleChoices(prompt) &&
      !PromptUtils.isPromptWithDefaultValue(prompt)
    );
  };

  public static readonly isPromptWithChoices = (
    prompt: Prompt,
  ): prompt is PromptWithUnknownChoices => {
    return 'choices' in prompt;
  };

  public static readonly isPromptWithChannelTypes = (
    prompt: Prompt,
  ): prompt is PromptWithChannelTypes => {
    return 'channelTypes' in prompt;
  };

  public static readonly isPromptWithMultiple = (
    prompt: Prompt,
  ): prompt is PromptWithMultiple => {
    return 'multiple' in prompt && !!prompt.multiple;
  };

  public static readonly isPromptWithMinMax = (
    prompt: Prompt,
  ): prompt is PromptWithMinMax => {
    return (prompt.type === 'string' || prompt.type === 'number') as boolean;
  };

  public static readonly isPromptWithMultipleChoices = (
    prompt: Prompt,
  ): prompt is PromptWithMultipleChoices => {
    return (
      PromptUtils.isPromptWithMultiple(prompt) &&
      PromptUtils.isPromptWithChoices(prompt)
    );
  };

  public static readonly isPromptWithDefaultValue = (
    prompt: Prompt,
  ): prompt is Prompt & {
    defaultValue: string | number | boolean | string[] | number[] | null;
  } => {
    return (
      'defaultValue' in prompt && typeof prompt.defaultValue !== 'undefined'
    );
  };

  public static readonly validatePrompt = (prompt: Prompt): void => {
    const stringifiedPrompt = JSON.stringify(prompt);

    if (prompt.id.length > 75) {
      throw new Error(
        `[INVALID_PROMPT] Prompt ID must be 75 characters or less: ${stringifiedPrompt}.`,
      );
    }

    if (prompt.message.length > 2000) {
      throw new Error(
        `[INVALID_PROMPT] Prompt message must be 2000 characters or less: ${stringifiedPrompt}.`,
      );
    }

    const minLength = this.resolveMinLength(prompt);
    if (minLength !== null) {
      if (minLength < 1) {
        throw new Error(
          `[INVALID_PROMPT] Minimum length must be at least 1: ${stringifiedPrompt}.`,
        );
      }

      if (minLength > 4000) {
        throw new Error(
          `[INVALID_PROMPT] Minimum length must be at most 4000: ${stringifiedPrompt}.`,
        );
      }

      if (
        PromptUtils.isPromptWithDefaultValue(prompt) &&
        prompt.defaultValue !== null
      ) {
        if (
          !Array.isArray(prompt.defaultValue) &&
          prompt.defaultValue.toString().length < minLength
        ) {
          throw new Error(
            `[INVALID_PROMPT] Default value must be at least the minimum length: ${stringifiedPrompt}.`,
          );
        }

        if (
          Array.isArray(prompt.defaultValue) &&
          prompt.defaultValue.some(
            (value) => value.toString().length < minLength,
          )
        ) {
          throw new Error(
            `[INVALID_PROMPT] Default values must be at least the minimum length: ${stringifiedPrompt}.`,
          );
        }
      }
    }

    const maxLength = this.resolveMaxLength(prompt);
    if (maxLength !== null) {
      if (maxLength < 1) {
        throw new Error(
          `[INVALID_PROMPT] Maximum length must be at least 1: ${stringifiedPrompt}.`,
        );
      }

      if (maxLength > 4000) {
        throw new Error(
          `[INVALID_PROMPT] Maximum length must be at most 4000: ${stringifiedPrompt}.`,
        );
      }

      if (
        PromptUtils.isPromptWithDefaultValue(prompt) &&
        prompt.defaultValue !== null
      ) {
        if (
          !Array.isArray(prompt.defaultValue) &&
          prompt.defaultValue.toString().length > maxLength
        ) {
          throw new Error(
            `[INVALID_PROMPT] Default value must be at most the maximum length: ${stringifiedPrompt}.`,
          );
        }

        if (
          Array.isArray(prompt.defaultValue) &&
          prompt.defaultValue.some(
            (value) => value.toString().length > maxLength,
          )
        ) {
          throw new Error(
            `[INVALID_PROMPT] Default values must be at most the maximum length: ${stringifiedPrompt}.`,
          );
        }
      }
    }

    if ('minValues' in prompt && typeof prompt.minValues === 'number') {
      if (prompt.minValues < 0) {
        throw new Error(
          `[INVALID_PROMPT] Minimum values must be at least 0: ${stringifiedPrompt}.`,
        );
      }
    }

    if ('maxValues' in prompt && typeof prompt.maxValues === 'number') {
      if (prompt.maxValues < 1) {
        throw new Error(
          `[INVALID_PROMPT] Maximum values must be at least 1: ${stringifiedPrompt}.`,
        );
      }
    }

    if (PromptUtils.isPromptWithChoices(prompt)) {
      if (!Array.isArray(prompt.choices) || prompt.choices.length === 0) {
        throw new Error(
          `[INVALID_PROMPT] Prompt with choices must have at least one choice: ${stringifiedPrompt}.`,
        );
      }

      if (
        !prompt.choices.every(
          (choice, ind, arr) =>
            arr.findIndex((c) => c.value === choice.value) === ind,
        )
      ) {
        throw new Error(
          `[INVALID_PROMPT] Choices must have unique values: ${stringifiedPrompt}.`,
        );
      }

      const defaultValue = PromptUtils.isPromptWithDefaultValue(prompt)
        ? prompt.defaultValue
        : null;

      if (
        (typeof defaultValue === 'string' || Array.isArray(defaultValue)) &&
        !prompt.choices.some((choice) =>
          Array.isArray(defaultValue)
            ? defaultValue
                .map((e) => e.toString())
                .includes(choice.value.toString())
            : choice.value === defaultValue,
        )
      ) {
        throw new Error(
          `[INVALID_PROMPT] Default value must be one of the available choices: ${stringifiedPrompt}.`,
        );
      }

      if ('minValues' in prompt && typeof prompt.minValues === 'number') {
        if (prompt.minValues > prompt.choices.length) {
          throw new Error(
            `[INVALID_PROMPT] Minimum values must be less than or equal to the number of choices: ${stringifiedPrompt}.`,
          );
        }

        if (
          defaultValue !== null &&
          Array.isArray(defaultValue) &&
          defaultValue.length < prompt.minValues
        ) {
          throw new Error(
            `[INVALID_PROMPT] Default values must be at least the minimum values: ${stringifiedPrompt}.`,
          );
        }
      }

      if ('maxValues' in prompt && typeof prompt.maxValues === 'number') {
        if (prompt.maxValues > prompt.choices.length) {
          throw new Error(
            `[INVALID_PROMPT] Maximum values must be less than or equal to the number of choices: ${stringifiedPrompt}.`,
          );
        }

        if (
          defaultValue !== null &&
          Array.isArray(defaultValue) &&
          defaultValue.length > prompt.maxValues
        ) {
          throw new Error(
            `[INVALID_PROMPT] Default values must be at most the maximum values: ${stringifiedPrompt}.`,
          );
        }
      }

      for (const choice of prompt.choices) {
        if (
          typeof choice.name !== 'string' ||
          typeof choice.value !== 'string'
        ) {
          throw new Error(
            `[INVALID_PROMPT] Choices must have a name and value: ${stringifiedPrompt}.`,
          );
        }

        if (choice.name.length > 100) {
          throw new Error(
            `[INVALID_PROMPT] Choice names must be 100 characters or less: ${stringifiedPrompt}.`,
          );
        }

        if (choice.value.length > 100) {
          throw new Error(
            `[INVALID_PROMPT] Choice values must be 100 characters or less: ${stringifiedPrompt}.`,
          );
        }
      }
    }
  };

  public static readonly validatePrompts = (prompts: Prompt[]): void => {
    const allUnique = prompts.every(
      (prompt, ind, arr) => arr.findIndex((p) => p.id === prompt.id) === ind,
    );

    if (!allUnique) {
      throw new Error(
        '[INVALID_PROMPTS] All prompts must have unique IDs within the array.',
      );
    }

    prompts.forEach(PromptUtils.validatePrompt);
  };

  public static readonly resolveMinLength = (prompt: Prompt): number | null => {
    const isChannel = prompt.type === 'channel';
    const isRole = prompt.type === 'role';

    return isRole || isChannel
      ? 17
      : 'minLength' in prompt && typeof prompt.minLength === 'number'
        ? prompt.minLength
        : 'choices' in prompt && prompt.choices && prompt.choices.length > 0
          ? prompt.choices.reduce(
              (acc, choice) =>
                acc === null
                  ? choice.value.length
                  : Math.min(acc, choice.value.length),
              null as number | null,
            )
          : null;
  };

  public static readonly resolveMaxLength = (prompt: Prompt): number | null => {
    const isChannel = prompt.type === 'channel';
    const isRole = prompt.type === 'role';

    return isRole || isChannel
      ? 20
      : 'maxLength' in prompt && typeof prompt.maxLength === 'number'
        ? prompt.maxLength
        : 'choices' in prompt && prompt.choices && prompt.choices.length > 0
          ? prompt.choices.reduce(
              (acc, choice) =>
                acc === null
                  ? choice.value.length
                  : Math.max(acc, choice.value.length),
              null as number | null,
            )
          : null;
  };

  public static validateConstraints = <
    P extends Prompt,
    PV extends ValueForPrompt<P, false>,
  >(
    prompt: P,
    transformedValue: PV,
  ): PV => {
    const safeArr = Array.isArray(transformedValue)
      ? transformedValue
      : [transformedValue];

    // Check base single/multiple
    if ('multiple' in prompt && prompt.multiple) {
      if (!Array.isArray(transformedValue)) {
        throw new Error(
          `[EXPECTED_MULTIPLE] Prompt is required to be multiple, received single: ${transformedValue}.`,
        );
      }
    } else {
      if (Array.isArray(transformedValue)) {
        throw new Error(
          `[EXPECTED_SINGLE] Prompt is required to be single, received multiple: ${transformedValue}.`,
        );
      }
    }

    // Handle Required
    if (transformedValue === null) {
      if (prompt.required || safeArr.length === 0) {
        throw new Error('You must provide a value for this prompt.');
      }

      return transformedValue;
    }

    // Handle choices (minValues, maxValues)
    if (PromptUtils.isPromptWithMultiple(prompt)) {
      if (typeof prompt.minValues === 'number') {
        if (prompt.minValues > safeArr.length) {
          throw new Error(
            `At least ${prompt.minValues} value${
              prompt.minValues === 1 ? '' : 's'
            } must be selected, you selected ${safeArr.length}.`,
          );
        }
      }
      if (typeof prompt.maxValues === 'number') {
        if (prompt.maxValues < safeArr.length) {
          throw new Error(
            `At most ${prompt.maxValues} value${
              prompt.maxValues === 1 ? '' : 's'
            } must be selected, you selected ${safeArr.length}.`,
          );
        }
      }
    }

    const isChannel = prompt.type === 'channel';
    const isRole = prompt.type === 'role';
    const minLength = this.resolveMinLength(prompt);
    const maxLength = this.resolveMaxLength(prompt);

    // Handle min/max values (number, string, channel, role)
    if (PromptUtils.isPromptWithMinMax(prompt) || isChannel || isRole) {
      for (const value of safeArr) {
        // Handle number minValue, maxValue
        if (prompt.type === 'number' && ArrayUtils.isNumberArray(safeArr)) {
          if ('minValue' in prompt && typeof prompt.minValue === 'number') {
            if (prompt.minValue > value) {
              throw new Error(
                `A minimum value of ${prompt.minValue} is required, you provided ${value}.`,
              );
            }
          }
          if ('maxValue' in prompt && typeof prompt.maxValue === 'number') {
            if (prompt.maxValue < value) {
              throw new Error(
                `A maximum value of ${prompt.maxValue} is required, you provided ${value}.`,
              );
            }
          }
        }
        // Handle minLength and maxLength (number, string, channel, role)
        if (minLength !== null) {
          if (minLength > value.toString().length) {
            throw new Error(
              `A value with at least ${minLength} character${
                minLength === 1 ? '' : 's'
              } is required, ${value} has ${value.toString().length}.`,
            );
          }
        }
        if (maxLength !== null) {
          if (maxLength < value.toString().length) {
            throw new Error(
              `A value with at most ${maxLength} character${
                maxLength === 1 ? '' : 's'
              } is required, ${value} has ${value.toString().length}.`,
            );
          }
        }
      }
    }

    return transformedValue;
  };

  public static readonly promptInteraction = async <
    P extends Prompt,
    I extends RepliableInteraction | ModalSubmitInteraction,
  >(
    interaction: AvailableGuildInteraction<I>,
    prompt: P,
    prompts: P[],
    {
      contextTransformer,
      deferUpdate,
      deferReply,
    }: {
      contextTransformer?: (
        prompt: P,
        arr: P[],
        ind: number,
        collected: string[] | null,
      ) => GenericInteractionOptions;
    } & {
      /** Should we defer the update to the interaction? Has priority over `deferReply`. */
      deferUpdate?: boolean;
      /** Should we defer the reply to the interaction? */
      deferReply?: boolean;
    },
  ) => {
    const collect = async (collected: string[]) => {
      const promptOptions: GenericInteractionOptions = contextTransformer?.(
        prompt,
        prompts,
        prompts.indexOf(prompt),
        collected.length === 0 ? null : collected,
      ) ?? {
        content: prompt.message,
      };

      let componentType: ComponentType = ComponentType.StringSelect;

      // Select Menus
      if (PromptUtils.isPromptWithChoices(prompt)) {
        componentType = ComponentType.StringSelect;

        const stringSelect = new StringSelectMenuBuilder()
          .setCustomId(`@${prompt.id}`)
          .setDisabled(false)
          .setPlaceholder(
            PromptUtils.isPromptWithMultiple(prompt)
              ? `Select between ${(prompt.minValues ?? prompt.required) ? 1 : 0} and ${
                  prompt.maxValues ?? prompt.choices.length
                } options...`
              : 'Select an option...',
          )
          .setMinValues(
            PromptUtils.isPromptWithMultiple(prompt)
              ? (prompt.minValues ?? (prompt.required ? 1 : 0))
              : 1,
          )
          .setMaxValues(
            PromptUtils.isPromptWithMultiple(prompt)
              ? (prompt.maxValues ?? prompt.choices.length)
              : 1,
          )
          .addOptions(
            prompt.choices.map((choice) => ({
              label: choice.name,
              value: choice.value.toString(),
              default: PromptUtils.isPromptWithDefaultValue(prompt)
                ? Array.isArray(prompt.defaultValue)
                  ? prompt.defaultValue
                      .map((e) => e.toString())
                      .includes(choice.value.toString())
                  : prompt.defaultValue === choice.value
                : false,
            })),
          );

        promptOptions.components = [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            stringSelect,
          ),
        ];
      }
      // Buttons to collect information via modal
      else {
        componentType = ComponentType.Button;
        if (PromptUtils.isPromptWithMultiple(prompt)) {
          // Collect multiple values
          promptOptions.components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
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
            ),
          ];
        } else {
          // Collect a single form value
          promptOptions.components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(`@${prompt.id}-submit-value`)
                .setLabel('Submit Information')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝'),
            ),
          ];
        }
      }

      const replyFn =
        interaction.replied || interaction.deferred
          ? interaction.editReply.bind(interaction)
          : interaction.reply.bind(interaction);

      const msg = await replyFn(promptOptions);

      let response:
        | StringSelectMenuInteraction<CacheType>
        | ButtonInteraction<CacheType>
        | ModalSubmitInteraction<CacheType> = await msg.awaitMessageComponent({
        componentType,
        time: UnitConstants.MS_IN_ONE_MINUTE * 14,
        filter: (i) =>
          i.customId === `@${prompt.id}` || // Select Menu
          i.customId === `@${prompt.id}-add` || // Buttons
          i.customId === `@${prompt.id}-submit-value` ||
          i.customId === `@${prompt.id}-submit-values`,
      });

      const customId = response.customId;

      if (!response) {
        throw new Error('Prompt timed out.');
      }

      if (response.isButton()) {
        if (
          customId === `@${prompt.id}-add` ||
          customId === `@${prompt.id}-submit-value`
        ) {
          const input = new TextInputBuilder()
            .setCustomId(`@${prompt.id}-input`)
            .setLabel(StringUtils.truncate(prompt.message, 45))
            .setPlaceholder(StringUtils.truncate(prompt.message, 100))
            .setRequired(prompt.required)
            .setStyle(TextInputStyle.Short);

          const minLength = this.resolveMinLength(prompt);
          const maxLength = this.resolveMaxLength(prompt);

          if (typeof minLength === 'number') {
            input.setMinLength(minLength);
          }

          if (typeof maxLength === 'number') {
            input.setMaxLength(maxLength);
          }

          if (
            PromptUtils.isPromptWithDefaultValue(prompt) &&
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
                new ActionRowBuilder<TextInputBuilder>().addComponents(input),
              ),
          );

          response = await response.awaitModalSubmit({
            time: UnitConstants.MS_IN_ONE_MINUTE * 14,
            filter: (interaction) => interaction.customId === `@${prompt.id}`,
          });
        }
      }

      if (deferUpdate) await response.deferUpdate();
      else if (deferReply) await response.deferReply();

      if (customId === `@${prompt.id}-add` && response.isModalSubmit()) {
        collected.push(response.fields.getField(`@${prompt.id}-input`).value);

        return collect(collected);
      }

      return response as AvailableGuildInteraction<typeof response>;
    };

    const _collected: string[] =
      !PromptUtils.isPromptWithChoices(prompt) &&
      PromptUtils.isPromptWithMultiple(prompt) &&
      PromptUtils.isPromptWithDefaultValue(prompt) &&
      prompt.defaultValue
        ? Array.isArray(prompt.defaultValue)
          ? prompt.defaultValue.map((value) => value.toString())
          : [prompt.defaultValue.toString()]
        : [];

    return [
      await collect(_collected),
      _collected.length === 0
        ? null
        : this.validateConstraints(prompt, [
            ...new Set(_collected),
          ] as ValueForPrompt<P, false>),
    ] as const;
  };

  public static readonly transformPromptValue = <P extends Prompt>(
    prompt: P,
    resolvedValue: string | string[] | null,
    guild: Guild,
  ): ValueForPrompt<P, false> => {
    const valueTransformer = <T>(
      value: string | string[] | null,
      transformer?: (value: string) => T,
      filter?: (transformedValue: T, ind: number, arr: T[]) => boolean,
    ): ValueForPrompt<P, false> => {
      const castValue = (value: string | string[] | null | T | T[]) =>
        value as ValueForPrompt<P, false>;

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

            if (!PromptUtils.isPromptWithChannelTypes(prompt)) {
              return true;
            }

            return (
              PromptUtils.isPromptWithChannelTypes(prompt) &&
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

  public static readonly handlePromptCollector = async <
    P extends Prompt,
    I extends PromptInteraction,
  >(
    prompt: P,
    interaction: I,
  ): Promise<ValueForPrompt<P, false>> => {
    const valuesArr = interaction.isAnySelectMenu()
      ? interaction.values
      : interaction.isModalSubmit()
        ? [interaction.fields.getField(`@${prompt.id}-input`).value]
        : [];

    const resolvedValue = PromptUtils.isPromptWithMultiple(prompt)
      ? valuesArr
      : (valuesArr[0] ?? null);

    if (valuesArr.length === 0 && prompt.required) {
      throw new Error('Prompt is required.');
    }

    const transformed = PromptUtils.transformPromptValue(
      prompt,
      resolvedValue,
      interaction.guild,
    );

    console.log({
      valuesArr,
      resolvedValue,
      transformed,
    });

    return PromptUtils.validateConstraints(prompt, transformed);
  };

  public static readonly handlePromptInteraction = async <P extends Prompt>(
    interaction: AvailableGuildInteraction<RepliableInteraction>,
    prompts: P[],
    {
      onPromptError,
      contextTransformer,
      onFinish,
    }: {
      onPromptError?: (
        error: Error,
        interaction: PromptInteraction,
        prompt: P,
      ) => void;
      contextTransformer?: (
        prompt: P,
        arr: P[],
        ind: number,
        collected: string[] | null,
      ) => GenericInteractionOptions;
      onFinish?: (
        promptValues: Record<string, ValueForPrompt<P, false>>,
        interaction: PromptInteraction,
      ) => void;
    } = {},
  ): Promise<Record<string, ValueForPrompt<P, false>>> => {
    const promptValues: Record<string, ValueForPrompt<P, false>> = {};

    for await (const prompt of prompts) {
      const isLastPrompt = prompts.indexOf(prompt) === prompts.length - 1;
      const [i, collected] = await PromptUtils.promptInteraction(
        interaction,
        prompt,
        prompts,
        {
          contextTransformer,
          deferUpdate: !isLastPrompt,
          deferReply: isLastPrompt && !onFinish,
        },
      );

      try {
        promptValues[prompt.id] =
          collected === null
            ? await PromptUtils.handlePromptCollector(prompt, i)
            : collected;
      } catch (error) {
        if (onPromptError) {
          onPromptError(
            error instanceof Error ? error : new Error(`${error}`),
            i,
            prompt,
          );
        } else {
          throw error;
        }
      }

      if (isLastPrompt) {
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
      }
    }

    return promptValues;
  };
}

export {
  PromptUtils,
  type PromptType,
  type PromptChoice,
  type PromptBase,
  type PromptWithChoices,
  type PromptWithChannelTypes,
  type PromptWithMultiple,
  type PromptWithMultipleChoices,
  type PromptWithMinMax,
  type Prompt,
  type MappedPrompt,
  type MappedPrompts,
  type Prompts,
  type ValueForPrompt,
  type SinglePromptValue,
  type PromptValueResolver,
  type PromptValue,
};
