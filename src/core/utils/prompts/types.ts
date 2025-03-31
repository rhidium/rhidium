import type { ChannelType } from 'discord.js';

type PromptsResponse<P extends Prompt> = Record<
  string,
  ValueForPrompt<ResolvedPrompt<P>>
>;

type PromptType = 'string' | 'number' | 'boolean' | 'channel' | 'role' | 'user';

type PromptChoice<Value = string> = { name: string; value: Value };

type PromptBase = {
  id: string;
  type: PromptType;
  name: string;
  message?: string;
  required: boolean;
};

type PromptWithChoices = PromptBase & {
  type: 'string' | 'number' | 'channel' | 'role' | 'user';
  choices: PromptChoice[];
};

type PromptWithChannelTypes = PromptBase & {
  type: 'channel';
  channelTypes: ChannelType[];
};

type PromptWithMultiple = PromptBase & {
  type: 'string' | 'number' | 'channel' | 'role' | 'user';
  multiple: true;
  minValues?: number;
  maxValues?: number;
};

type PromptWithMultipleChoices = PromptBase & {
  type: 'string' | 'number' | 'channel' | 'role' | 'user';
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

type SinglePromptValue<Type extends PromptType> = Type extends 'string'
  ? string
  : Type extends 'number'
    ? number
    : Type extends 'boolean'
      ? boolean
      : Type extends 'channel'
        ? string
        : Type extends 'role'
          ? string
          : Type extends 'user'
            ? string
            : never;

type PromptValueResolver<
  Type extends PromptType,
  Multiple extends boolean,
> = Multiple extends true ? SinglePromptValue<Type>[] : SinglePromptValue<Type>;

type PromptValue<
  Required extends boolean,
  Type extends PromptType,
  Multiple extends boolean,
> = [Required, Multiple] extends [true, boolean] | [boolean, true]
  ? PromptValueResolver<Type, Multiple>
  : PromptValueResolver<Type, Multiple> | null;

type ValueForPrompt<P extends Prompt> = P extends {
  required: infer R;
  type: infer T extends PromptType;
  multiple?: infer M;
}
  ? PromptValue<R extends true ? true : false, T, M extends true ? true : false>
  : never;

type PromptWithUnknownChoices = Omit<PromptWithChoices, 'choices'> & {
  choices: PromptChoice<string | number>[];
};

export {
  type PromptsResponse,
  type PromptType,
  type PromptChoice,
  type PromptBase,
  type PromptWithChoices,
  type PromptWithChannelTypes,
  type PromptWithMultiple,
  type PromptWithMultipleChoices,
  type PromptWithDefaultValue,
  type PromptWithMinMax,
  type Prompt,
  type AnyPromptValue,
  type ResolvedPrompt,
  type SinglePromptValue,
  type PromptValueResolver,
  type PromptValue,
  type ValueForPrompt,
  type PromptWithUnknownChoices,
};
