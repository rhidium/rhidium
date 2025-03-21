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
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  RoleSelectMenuInteraction,
  APIEmbedField,
} from 'discord.js';
import { UnitConstants } from '../constants';
import { AvailableGuildInteraction } from '../commands';
import { ArrayUtils, StringUtils } from './common';

type PromptInteraction = AvailableGuildInteraction<
  | ChannelSelectMenuInteraction<CacheType>
  | RoleSelectMenuInteraction<CacheType>
  | StringSelectMenuInteraction<CacheType>
  | ButtonInteraction<CacheType>
  | ModalSubmitInteraction<CacheType>
>;

type GenericInteractionOptions = InteractionReplyOptions &
  InteractionEditReplyOptions;

type PromptDeferOptions = {
  /** Should we defer the update to the interaction? Has priority over `deferReply`. */
  deferUpdate?: boolean;
  /** Should we defer the reply to the interaction? */
  deferReply?: boolean;
};

type PromptInteractionOptions<
  P extends Prompt,
  ResolveResources extends boolean,
> = {
  resolveResources?: ResolveResources;
  contextTransformer?: (
    prompt: ResolvedPrompt<P>,
    arr: ResolvedPrompt<P>[],
    ind: number,
    collected: string[] | null,
    errorFeedbackFields: APIEmbedField[],
  ) => GenericInteractionOptions;
};

type HandlePromptInteractionOptions<
  P extends Prompt,
  ResolveResources extends boolean,
> = PromptInteractionOptions<P, ResolveResources> & {
  onPromptError?: (
    error: Error,
    interaction: PromptInteraction,
    prompt: ResolvedPrompt<P>,
  ) => void;
  onFinish?: (
    promptValues: Record<
      string,
      ValueForPrompt<ResolvedPrompt<P>, ResolveResources>
    >,
    interaction: PromptInteraction,
  ) => void;
};

type PromptsResponse<
  P extends Prompt,
  ResolveResources extends boolean,
> = Record<string, ValueForPrompt<ResolvedPrompt<P>, ResolveResources>>;

type PromptType = 'string' | 'number' | 'boolean' | 'channel' | 'role';

type PromptChoice<Value = string> = { name: string; value: Value };

type PromptBase = {
  id: string;
  type: PromptType;
  name: string;
  message?: string;
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

type AnyPromptValue = string | number | boolean | string[] | number[] | null;

type ResolvedPrompt<P extends Prompt> = Omit<P, 'message'> & {
  message: string;
};

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
  defaultValue?:
    | PromptValue<Required, Type, Multiple, ResolveResources, CType>
    | ((
        guild: Guild,
      ) =>
        | PromptValue<Required, Type, Multiple, ResolveResources, CType>
        | Promise<
            PromptValue<Required, Type, Multiple, ResolveResources, CType>
          >);
  onCollect?: (
    value: PromptValue<Required, Type, Multiple, ResolveResources, CType>,
  ) => void;
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
    defaultValue: AnyPromptValue;
  } => {
    return (
      'defaultValue' in prompt && typeof prompt.defaultValue !== 'undefined'
    );
  };

  public static readonly defaultFormatter = (
    prompt: Prompt,
    value: AnyPromptValue,
    arrJoin = ', ',
  ): string => {
    console.log({ prompt, value });

    const formatter = (v: AnyPromptValue): string => {
      if (v === null) {
        return PromptUtils.isPromptWithMultiple(prompt)
          ? 'None'
          : 'Not configured';
      }

      switch (prompt.type) {
        case 'role':
          return `<@&${v}>`;
        case 'channel':
          return `<#${v}>`;
        case 'boolean':
          return v ? 'Enabled' : 'Disabled';
        case 'number':
          return v.toLocaleString();
        default:
          return v.toString();
      }
    };

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'None';
      }

      return value.map(formatter).join(arrJoin);
    }

    return formatter(value);
  };

  public static readonly defaultMessage = (
    prompt: Prompt,
    short = PromptUtils.isPromptWithChoices(prompt),
  ): string => {
    let base = `Please ${
      PromptUtils.isPromptWithChoices(prompt)
        ? 'make a selection'
        : 'provide a value'
    } **(${prompt.required ? 'Required' : 'Optional'})**.`;

    if (short) return base;

    if (
      PromptUtils.isPromptWithMinMax(prompt) &&
      !PromptUtils.isPromptWithChoices(prompt)
    ) {
      const minLength = PromptUtils.resolveMinLength(prompt);
      const maxLength = PromptUtils.resolveMaxLength(prompt);
      const minValue = PromptUtils.resolveMinValue(prompt);
      const maxValue = PromptUtils.resolveMaxValue(prompt);

      if (minLength !== null && maxLength !== null) {
        base += `\n- Length must be between **${minLength}** and **${maxLength}** characters.`;
      } else {
        if (minLength !== null) {
          base += `\n- Minimum length: **${minLength}**.`;
        }

        if (maxLength !== null) {
          base += `\n- Maximum length: **${maxLength}**.`;
        }
      }

      if (prompt.type === 'number') {
        if (minValue !== null && maxValue !== null) {
          base += `\n- Value must be between **${minValue}** and **${maxValue}**.`;
        } else {
          if (minValue !== null) {
            base += `\n- Minimum value: **${minValue}**.`;
          }

          if (maxValue !== null) {
            base += `\n- Maximum value: **${maxValue}**.`;
          }
        }
      }
    }

    if (PromptUtils.isPromptWithMultiple(prompt)) {
      if (
        typeof prompt.minValues !== 'undefined' &&
        typeof prompt.maxValues !== 'undefined'
      ) {
        base += `\n- Select between **${prompt.minValues}** and **${prompt.maxValues}** values.`;
      } else {
        if (typeof prompt.minValues !== 'undefined') {
          base += `\n- Select at least **${prompt.minValues}** value${
            prompt.minValues === 1 ? '' : 's'
          }.`;
        }

        if (typeof prompt.maxValues !== 'undefined') {
          base += `\n- Select at most **${prompt.maxValues}** value${
            prompt.maxValues === 1 ? '' : 's'
          }.`;
        }
      }
    }

    return base;
  };

  public static readonly resolvePrompt = <P extends Prompt>(
    prompt: P,
  ): ResolvedPrompt<P> => {
    return {
      ...prompt,
      message: prompt.message ?? this.defaultMessage(prompt),
    };
  };

  public static readonly validatePrompt = (
    prompt: ResolvedPrompt<Prompt>,
  ): void => {
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
        prompt.defaultValue !== null &&
        typeof prompt.defaultValue !== 'function'
      ) {
        const validateSnowflake = (value: string) =>
          /^\d{17,19}$/.test(value.toString());

        if (!Array.isArray(prompt.defaultValue)) {
          if (prompt.type === 'role' || prompt.type === 'channel') {
            if (!validateSnowflake(prompt.defaultValue.toString())) {
              throw new Error(
                `[INVALID_PROMPT] Default value must be a valid snowflake: ${stringifiedPrompt}.`,
              );
            }
          }

          if (prompt.defaultValue.toString().length < minLength) {
            throw new Error(
              `[INVALID_PROMPT] Default value must be at least the minimum length: ${stringifiedPrompt}.`,
            );
          }
        }

        if (Array.isArray(prompt.defaultValue)) {
          if (prompt.type === 'role' || prompt.type === 'channel') {
            if (
              prompt.defaultValue.some(
                (value) => !validateSnowflake(value.toString()),
              )
            ) {
              throw new Error(
                `[INVALID_PROMPT] Default values must be valid snowflakes: ${stringifiedPrompt}.`,
              );
            }

            if (
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
        prompt.defaultValue !== null &&
        typeof prompt.defaultValue !== 'function'
      ) {
        if (
          !Array.isArray(prompt.defaultValue) &&
          typeof prompt.defaultValue !== 'function' &&
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
        (typeof defaultValue === 'string' ||
          typeof defaultValue === 'number' ||
          Array.isArray(defaultValue)) &&
        !prompt.choices.some((choice) =>
          Array.isArray(defaultValue)
            ? defaultValue.map((e) => e).includes(choice.value)
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
          (typeof choice.value !== 'string' && typeof choice.value !== 'number')
        ) {
          throw new Error(
            `[INVALID_PROMPT] Choices must have a name and string/number value: ${stringifiedPrompt}.`,
          );
        }

        if (choice.name.length > 100) {
          throw new Error(
            `[INVALID_PROMPT] Choice names must be 100 characters or less: ${stringifiedPrompt}.`,
          );
        }

        if (choice.value.toString().length > 100) {
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

    return prompts.map(this.resolvePrompt).forEach(this.validatePrompt);
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

  public static readonly resolveMinValue = (prompt: Prompt): number | null => {
    return PromptUtils.isPromptWithChoices(prompt)
      ? prompt.choices.reduce(
          (acc, choice) =>
            acc === null
              ? Number(choice.value)
              : Math.min(acc, Number(choice.value)),
          null as number | null,
        )
      : 'minValue' in prompt && typeof prompt.minValue === 'number'
        ? prompt.minValue
        : null;
  };

  public static readonly resolveMaxValue = (prompt: Prompt): number | null => {
    return PromptUtils.isPromptWithChoices(prompt)
      ? prompt.choices.reduce(
          (acc, choice) =>
            acc === null
              ? Number(choice.value)
              : Math.max(acc, Number(choice.value)),
          null as number | null,
        )
      : 'maxValue' in prompt && typeof prompt.maxValue === 'number'
        ? prompt.maxValue
        : null;
  };

  public static validateConstraints = <
    P extends Prompt,
    ResolveResources extends boolean,
  >(
    prompt: ResolvedPrompt<P>,
    transformedValue: ValueForPrompt<ResolvedPrompt<P>, ResolveResources>,
  ): ValueForPrompt<ResolvedPrompt<P>, ResolveResources> => {
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
    const minValue = this.resolveMinValue(prompt);
    const maxValue = this.resolveMaxValue(prompt);
    const minLength = this.resolveMinLength(prompt);
    const maxLength = this.resolveMaxLength(prompt);

    // Handle min/max values (number, string, channel, role)
    if (
      PromptUtils.isPromptWithMinMax(prompt) ||
      isChannel ||
      isRole ||
      minValue !== null ||
      maxValue !== null
    ) {
      for (const value of safeArr) {
        const valueStr =
          typeof value === 'object' &&
          value !== null &&
          'id' in value &&
          typeof value.id === 'string'
            ? value.id
            : value.toString();

        // Handle number minValue, maxValue
        if (prompt.type === 'number' && ArrayUtils.isNumberArray(safeArr)) {
          if (minValue !== null) {
            if (minValue > value) {
              throw new Error(
                `A minimum value of ${minValue} is required, you provided ${value}.`,
              );
            }
          }
          if (maxValue !== null) {
            if (maxValue < value) {
              throw new Error(
                `A maximum value of ${maxValue} is required, you provided ${value}.`,
              );
            }
          }
        }
        // Handle minLength and maxLength (number, string, channel, role)
        if (minLength !== null) {
          if (minLength > valueStr.length) {
            throw new Error(
              `A value with at least ${minLength} character${
                minLength === 1 ? '' : 's'
              } is required, ${value} has ${valueStr.length}.`,
            );
          }
        }
        if (maxLength !== null) {
          if (maxLength < valueStr.length) {
            throw new Error(
              `A value with at most ${maxLength} character${
                maxLength === 1 ? '' : 's'
              } is required, ${value} has ${valueStr.length}.`,
            );
          }
        }
      }
    }

    return transformedValue;
  };

  public static readonly promptInteraction = async <
    P extends Prompt,
    ResolveResources extends boolean,
    I extends RepliableInteraction | ModalSubmitInteraction,
  >(
    interaction: AvailableGuildInteraction<I>,
    prompt: ResolvedPrompt<P>,
    prompts: ResolvedPrompt<P>[],
    {
      contextTransformer,
      deferUpdate,
      deferReply,
    }: PromptDeferOptions & PromptInteractionOptions<P, ResolveResources> = {},
  ) => {
    const collect = async (
      collected: string[],
      errorFeedbackFields?: APIEmbedField[],
    ) => {
      const promptOptions: GenericInteractionOptions = contextTransformer?.(
        prompt,
        prompts,
        prompts.indexOf(prompts.find((p) => p.id === prompt.id) ?? prompt),
        collected.length === 0 ? null : collected,
        errorFeedbackFields ?? [],
      ) ?? {
        content: prompt.message,
        embeds: errorFeedbackFields ? [{ fields: errorFeedbackFields }] : [],
      };

      let hasSkipButton = false;
      let componentType: ComponentType = ComponentType.StringSelect;

      const minValues = !PromptUtils.isPromptWithMultiple(prompt)
        ? 1
        : PromptUtils.isPromptWithChoices(prompt)
          ? 'minValues' in prompt && typeof prompt.minValues === 'number'
            ? prompt.minValues
            : prompt.required
              ? 1
              : 0
          : 1;
      const maxValues = !PromptUtils.isPromptWithMultiple(prompt)
        ? 1
        : 'maxValues' in prompt && typeof prompt.maxValues === 'number'
          ? prompt.maxValues
          : PromptUtils.isPromptWithChoices(prompt)
            ? prompt.choices.length
            : null;
      const defaultValues = collected.length
        ? collected.map((c) => c.toString())
        : PromptUtils.isPromptWithDefaultValue(prompt) &&
            prompt.defaultValue !== null
          ? Array.isArray(prompt.defaultValue)
            ? prompt.defaultValue.map((e) => e.toString())
            : [prompt.defaultValue.toString()]
          : [];
      const safeDefaultValues =
        maxValues !== null && defaultValues.length > maxValues
          ? defaultValues.slice(0, maxValues)
          : defaultValues;

      // Select Menus
      if (
        PromptUtils.isPromptWithChoices(prompt) ||
        prompt.type === 'channel' ||
        prompt.type === 'role'
      ) {
        let selectMenu:
          | StringSelectMenuBuilder
          | ChannelSelectMenuBuilder
          | RoleSelectMenuBuilder;

        if (prompt.type === 'channel') {
          componentType = ComponentType.ChannelSelect;
          selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId(`@${prompt.id}`)
            .setDisabled(false);
        } else if (prompt.type === 'role') {
          componentType = ComponentType.RoleSelect;
          selectMenu = new RoleSelectMenuBuilder()
            .setCustomId(`@${prompt.id}`)
            .setDisabled(false);
        } /* isPromptWithChoices */ else {
          componentType = ComponentType.StringSelect;
          selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`@${prompt.id}`)
            .setDisabled(false);
        }

        const resource =
          prompt.type === 'channel'
            ? 'channel'
            : prompt.type === 'role'
              ? 'role'
              : 'option';

        const placeholderBase = PromptUtils.isPromptWithMultiple(prompt)
          ? maxValues !== null
            ? `Select between ${minValues} and ${maxValues} ${StringUtils.pluralize(resource, maxValues)}...`
            : `Select at least ${StringUtils.pluralize(resource, minValues)}...`
          : `Select a ${prompt.type}...`;

        selectMenu.setPlaceholder(placeholderBase);
        selectMenu.setMinValues(minValues);

        console.log({
          placeholderBase,
          minValues,
          maxValues,
          safeDefaultValues,
        });

        if (maxValues !== null) {
          selectMenu.setMaxValues(maxValues);
        }

        if (safeDefaultValues.length >= 1) {
          if ('setDefaultChannels' in selectMenu) {
            selectMenu.setDefaultChannels(safeDefaultValues);
          }
          if ('setDefaultRoles' in selectMenu) {
            selectMenu.setDefaultRoles(safeDefaultValues);
          }
        }

        if (
          PromptUtils.isPromptWithChoices(prompt) &&
          'addOptions' in selectMenu
        ) {
          selectMenu.addOptions(
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
        }

        if (
          PromptUtils.isPromptWithChannelTypes(prompt) &&
          'setChannelTypes' in selectMenu
        ) {
          selectMenu.setChannelTypes(prompt.channelTypes);
        }

        const components: ActionRowBuilder<
          | StringSelectMenuBuilder
          | ChannelSelectMenuBuilder
          | RoleSelectMenuBuilder
          | ButtonBuilder
        >[] = [
          new ActionRowBuilder<
            | StringSelectMenuBuilder
            | ChannelSelectMenuBuilder
            | RoleSelectMenuBuilder
          >().addComponents(selectMenu),
        ];

        hasSkipButton = PromptUtils.isPromptWithMultiple(prompt)
          ? (collected.length ? collected.length : safeDefaultValues.length) >=
            minValues
          : !prompt.required || safeDefaultValues.length > 0;

        if (hasSkipButton) {
          components.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(`@${prompt.id}-skip`)
                .setLabel('Skip')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏭️'),
            ),
          );
        }

        promptOptions.components = components;
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
        | ChannelSelectMenuInteraction<CacheType>
        | RoleSelectMenuInteraction<CacheType>
        | StringSelectMenuInteraction<CacheType>
        | ButtonInteraction<CacheType>
        | ModalSubmitInteraction<CacheType> = await Promise.race([
        msg.awaitMessageComponent({
          componentType,
          time: UnitConstants.MS_IN_ONE_MINUTE * 14,
          filter: (i) =>
            i.customId === `@${prompt.id}` || // Select Menu
            i.customId === `@${prompt.id}-add` || // Buttons
            i.customId === `@${prompt.id}-submit-value` ||
            i.customId === `@${prompt.id}-submit-values`,
        }),
        // Skip button for select menus
        msg.awaitMessageComponent({
          componentType: ComponentType.Button,
          time: UnitConstants.MS_IN_ONE_MINUTE * 14,
          filter: (i) => i.customId === `@${prompt.id}-skip`,
        }),
      ]);

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
            .setLabel(StringUtils.truncate(prompt.name, 45))
            // [DEV] We need a proper tooltip if message missing, minLength, value, values, etc.
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

      if (
        (customId === `@${prompt.id}-add` ||
          customId === `@${prompt.id}-submit-value`) &&
        response.isModalSubmit()
      ) {
        const input = response.fields.getField(`@${prompt.id}-input`).value;

        if (prompt.type === 'number') {
          try {
            PromptUtils.validateConstraints(
              prompt,
              (PromptUtils.isPromptWithMultiple(prompt)
                ? [Number(input)]
                : Number(input)) as ValueForPrompt<
                ResolvedPrompt<P>,
                ResolveResources
              >,
            );
          } catch (error) {
            return collect(collected, [
              {
                name: 'Invalid information provided, please try again.',
                value:
                  error instanceof Error ? error.message : 'Unknown error.',
              },
            ]);
          }
        }

        if (customId === `@${prompt.id}-add`) {
          collected.push(input);

          return collect(collected);
        }
      }

      if (customId === `@${prompt.id}-skip` && !collected.length) {
        collected.push(
          ...(PromptUtils.isPromptWithMultiple(prompt)
            ? safeDefaultValues
            : ([safeDefaultValues[0]] as string[])),
        );
      }

      return response as AvailableGuildInteraction<typeof response>;
    };

    const _collected: string[] = [];

    return [
      await collect(_collected),
      _collected.length === 0
        ? null
        : (() => {
            const resolvedCollected = [
              ...new Set(_collected),
            ] as unknown as ValueForPrompt<ResolvedPrompt<P>, ResolveResources>;

            const og = this.validateConstraints<
              ResolvedPrompt<P>,
              ResolveResources
            >(
              prompt,
              PromptUtils.isPromptWithMultiple(prompt)
                ? resolvedCollected
                : ((
                    resolvedCollected as unknown as ValueForPrompt<
                      ResolvedPrompt<P>,
                      ResolveResources
                    >[]
                  )[0] as ValueForPrompt<ResolvedPrompt<P>, ResolveResources>),
            );

            if (prompt.type === 'number') {
              return (og as unknown as string[]).map((value) =>
                Number(value),
              ) as unknown as ValueForPrompt<
                ResolvedPrompt<P>,
                ResolveResources
              >;
            }

            return og;
          })(),
    ] as const;
  };

  public static readonly transformPromptValue = <
    P extends Prompt,
    ResolveResources extends boolean,
  >(
    prompt: P,
    resolveResources: ResolveResources,
    resolvedValue: string | string[] | null,
    guild: Guild,
  ): ValueForPrompt<P, ResolveResources> => {
    const valueTransformer = <T>(
      value: string | string[] | null,
      transformer?: (value: string) => T,
      filter?: (transformedValue: T, ind: number, arr: T[]) => boolean,
    ): ValueForPrompt<P, ResolveResources> => {
      const isRole = prompt.type === 'role';
      const isChannel = prompt.type === 'channel';

      const castValue = (value: string | string[] | null | T | T[]) => {
        const idResolver = (_value: string | string[] | null | T | T[]) =>
          typeof _value === 'object' &&
          _value !== null &&
          'id' in _value &&
          typeof _value.id === 'string'
            ? _value.id
            : `${_value}`;

        // Cast resource objects back to string
        if ((isRole || isChannel) && !resolveResources) {
          if (Array.isArray(value)) {
            return value.map(idResolver) as ValueForPrompt<P, ResolveResources>;
          }

          return idResolver(value) as ValueForPrompt<P, ResolveResources>;
        }

        return value as ValueForPrompt<P, ResolveResources>;
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
    ResolveResources extends boolean = false,
  >(
    prompt: ResolvedPrompt<P>,
    interaction: I,
    resolveResources?: ResolveResources,
  ): Promise<ValueForPrompt<ResolvedPrompt<P>, ResolveResources>> => {
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
      resolveResources ?? false,
      resolvedValue,
      interaction.guild,
    );

    console.log({
      valuesArr,
      resolvedValue,
      transformed,
    });

    return PromptUtils.validateConstraints<ResolvedPrompt<P>, ResolveResources>(
      prompt,
      transformed,
    );
  };

  public static readonly handlePromptInteraction = async <
    P extends Prompt,
    ResolveResources extends boolean = false,
  >(
    interaction: AvailableGuildInteraction<RepliableInteraction>,
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
        | ValueForPrompt<ResolvedPrompt<P>, ResolveResources>
        | ((
            guild: Guild,
          ) =>
            | ValueForPrompt<ResolvedPrompt<P>, ResolveResources>
            | Promise<ValueForPrompt<ResolvedPrompt<P>, ResolveResources>>);
    })[],
    options?: HandlePromptInteractionOptions<P, ResolveResources>,
  ): Promise<PromptsResponse<P, ResolveResources>> => {
    const { onPromptError, contextTransformer, onFinish, resolveResources } =
      options ?? {};

    const resolvedPrompts = prompts.map(PromptUtils.resolvePrompt);
    const promptValues: Record<
      string,
      ValueForPrompt<ResolvedPrompt<P>, ResolveResources>
    > = {};

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

      console.log({
        deferUpdate: !isLastPrompt || typeof onFinish === 'function',
        deferReply: isLastPrompt && !onFinish,
      });

      const [i, collected] = await PromptUtils.promptInteraction(
        interaction,
        promptWithDefault,
        resolvedPrompts,
        {
          contextTransformer,
          deferUpdate: !isLastPrompt || typeof onFinish === 'function',
          deferReply: isLastPrompt && !onFinish,
        },
      );

      console.log('collected', collected);

      try {
        promptValues[prompt.id] =
          collected === null
            ? await PromptUtils.handlePromptCollector(
                promptWithDefault,
                i,
                resolveResources,
              )
            : collected;
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
  type PromptInteraction,
  type PromptType,
  type PromptChoice,
  type PromptBase,
  type PromptWithChoices,
  type PromptWithChannelTypes,
  type PromptWithMultiple,
  type PromptWithMultipleChoices,
  type PromptWithMinMax,
  type Prompt,
  type ResolvedPrompt,
  type MappedPrompt,
  type MappedPrompts,
  type Prompts,
  type ValueForPrompt,
  type SinglePromptValue,
  type PromptValueResolver,
  type PromptValue,
};
