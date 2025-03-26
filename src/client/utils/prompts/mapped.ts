import type { Guild } from 'discord.js';
import type { Prompt, PromptChoice, PromptType, PromptValue } from './types';

type MappedPrompt<
  Type extends PromptType,
  Required extends boolean,
  Multiple extends boolean,
> = Prompt & {
  type: Type;
  required: Required;
  multiple: Multiple;
  choices?: PromptChoice<PromptValue<Required, Type, false>>[];
  defaultValue?:
    | PromptValue<Required, Type, Multiple>
    | ((
        guild: Guild,
      ) =>
        | PromptValue<Required, Type, Multiple>
        | Promise<PromptValue<Required, Type, Multiple>>);
  onCollect?: (value: PromptValue<Required, Type, Multiple>) => void;
};

type MappedPrompts = {
  [T in PromptType]:
    | MappedPrompt<T, true, true>
    | MappedPrompt<T, true, false>
    | MappedPrompt<T, false, true>
    | MappedPrompt<T, false, false>;
};

type Prompts = {
  [K in keyof MappedPrompts]: MappedPrompts[K];
}[keyof MappedPrompts][];

export { type MappedPrompt, type MappedPrompts, type Prompts };
