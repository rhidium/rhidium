import { AnyPromptValue, Prompt, PromptType, ResolvedPrompt } from './types';
import { PromptValidation } from './validation';

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

export { PromptResolver };
