import { ArrayUtils } from '../common/arrays';
import type {
  AnyPromptValue,
  Prompt,
  PromptType,
  PromptWithChannelTypes,
  PromptWithMinMax,
  PromptWithMultiple,
  PromptWithMultipleChoices,
  PromptWithRegexValidation,
  PromptWithUnknownChoices,
  ResolvedPrompt,
  ValueForPrompt,
} from './types';

class PromptResolver {
  private constructor() {}

  public static readonly resolvePrompt = <P extends Prompt>(
    prompt: P,
  ): ResolvedPrompt<P> => {
    return {
      ...prompt,
      message: prompt.message ?? this.defaultMessage(prompt),
    };
  };

  public static readonly resolveMinLength = (prompt: Prompt): number | null => {
    return PromptValidation.isPromptWithResource(prompt)
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
    return PromptValidation.isPromptWithResource(prompt)
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
    return PromptValidation.isPromptWithChoices(prompt)
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
    return PromptValidation.isPromptWithChoices(prompt)
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

  public static readonly defaultFormatter = (
    prompt: Prompt,
    value: AnyPromptValue,
    arrJoin = ', ',
    emojis?: {
      success: string;
      error: string;
    },
    formatters?: Partial<Record<PromptType, (v: AnyPromptValue) => string>>,
  ): string => {
    const formatter = (v: AnyPromptValue): string => {
      if (v === null || typeof v === 'undefined') {
        return PromptValidation.isPromptWithMultiple(prompt)
          ? 'None'
          : 'Not configured';
      }

      if (
        formatters &&
        prompt.type in formatters &&
        typeof formatters[prompt.type] === 'function'
      ) {
        return formatters[prompt.type]!(v);
      }

      switch (prompt.type) {
        case 'role':
          return `<@&${v}>`;
        case 'channel':
          return `<#${v}>`;
        case 'user':
          return `<@${v}>`;
        case 'boolean':
          return v
            ? emojis?.success
              ? emojis?.success + ' Enabled/Active'
              : 'Enabled/Active'
            : emojis?.error
              ? emojis?.error + ' Disabled/Inactive'
              : 'Enabled/Active';
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
    short = PromptValidation.isPromptWithChoices(prompt),
  ): string => {
    let base = `Please ${
      PromptValidation.isPromptWithChoices(prompt)
        ? 'make a selection'
        : 'provide a value'
    } **(${prompt.required ? 'Required' : 'Optional'})**.`;

    if (short) return base;

    if (
      PromptValidation.isPromptWithMinMax(prompt) &&
      !PromptValidation.isPromptWithChoices(prompt)
    ) {
      const minLength = PromptResolver.resolveMinLength(prompt);
      const maxLength = PromptResolver.resolveMaxLength(prompt);
      const minValue = PromptResolver.resolveMinValue(prompt);
      const maxValue = PromptResolver.resolveMaxValue(prompt);

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

    if (PromptValidation.isPromptWithMultiple(prompt)) {
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
}

class PromptValidation {
  private constructor() {}

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

  public static readonly isPromptWithRegexValidation = (
    prompt: Prompt,
  ): prompt is PromptWithRegexValidation => {
    return (
      'regex' in prompt &&
      typeof prompt.regex === 'object' &&
      'pattern' in prompt.regex &&
      prompt.regex.pattern instanceof RegExp &&
      'validationError' in prompt.regex &&
      typeof prompt.regex.validationError === 'string'
    );
  };

  public static readonly isPromptWithMultipleChoices = (
    prompt: Prompt,
  ): prompt is PromptWithMultipleChoices => {
    return (
      this.isPromptWithMultiple(prompt) && this.isPromptWithChoices(prompt)
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

  public static readonly isPromptWithResource = (
    prompt: Prompt,
  ): prompt is Prompt & {
    type: 'role' | 'channel' | 'user';
  } => {
    return (
      prompt.type === 'role' ||
      prompt.type === 'channel' ||
      prompt.type === 'user'
    );
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

    const minLength = PromptResolver.resolveMinLength(prompt);
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
        this.isPromptWithDefaultValue(prompt) &&
        prompt.defaultValue !== null &&
        typeof prompt.defaultValue !== 'function'
      ) {
        const validateSnowflake = (value: string) =>
          /^\d{17,19}$/.test(value.toString());

        if (!Array.isArray(prompt.defaultValue)) {
          if (PromptValidation.isPromptWithResource(prompt)) {
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
          if (PromptValidation.isPromptWithResource(prompt)) {
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

    const maxLength = PromptResolver.resolveMaxLength(prompt);
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
        this.isPromptWithDefaultValue(prompt) &&
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

    if (this.isPromptWithChoices(prompt)) {
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

      const defaultValue = this.isPromptWithDefaultValue(prompt)
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

    return prompts
      .map(PromptResolver.resolvePrompt)
      .forEach(this.validatePrompt);
  };

  public static validateConstraints = <P extends Prompt>(
    prompt: ResolvedPrompt<P>,
    transformedValue: ValueForPrompt<ResolvedPrompt<P>>,
  ): ValueForPrompt<ResolvedPrompt<P>> => {
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
    if (PromptValidation.isPromptWithMultiple(prompt)) {
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

    const isResource = PromptValidation.isPromptWithResource(prompt);
    const minValue = PromptResolver.resolveMinValue(prompt);
    const maxValue = PromptResolver.resolveMaxValue(prompt);
    const minLength = PromptResolver.resolveMinLength(prompt);
    const maxLength = PromptResolver.resolveMaxLength(prompt);

    // Handle min/max values (number, string, channel, role)
    if (
      PromptValidation.isPromptWithMinMax(prompt) ||
      isResource ||
      minValue !== null ||
      maxValue !== null
    ) {
      for (const value of safeArr.filter((e) => typeof e !== 'undefined')) {
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

    // Handle regex validation
    if (PromptValidation.isPromptWithRegexValidation(prompt)) {
      const { pattern, validationError } = prompt.regex;
      for (const value of safeArr.filter((e) => typeof e !== 'undefined')) {
        const valueStr =
          typeof value === 'object' && value !== null && 'id' in value
            ? value.id
            : value.toString();
        if (!pattern.test(valueStr)) {
          throw new Error(
            `Value "${valueStr}" does not match the required pattern: ${validationError}`,
          );
        }
      }
    }

    return transformedValue;
  };
}

export { PromptResolver, PromptValidation };
