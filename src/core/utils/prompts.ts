import {
  CacheType,
  ChannelType,
  CommandInteractionOption,
  RepliableInteraction,
  Role,
} from 'discord.js';

type PromptType = 'string' | 'number' | 'boolean' | 'channel' | 'role';

type PromptChoice = { name: string; value: string };

type PromptBase = {
  id: string;
  type: PromptType;
  name: string;
  description: string;
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

type PromptWithMinMax = PromptBase &
  (
    | {
        type: 'string';
        minLength?: number;
        maxLength?: number;
      }
    | {
        type: 'number';
        minValue?: number;
        maxValue?: number;
      }
  );

type Prompt =
  | PromptBase
  | PromptWithChoices
  | PromptWithChannelTypes
  | PromptWithMultiple
  | PromptWithMinMax;

type CastPrompt<Type extends Prompt> = Type extends PromptBase
  ? PromptBase
  : Type extends PromptWithChoices
    ? PromptWithChoices
    : Type extends PromptWithChannelTypes
      ? PromptWithChannelTypes
      : Type extends PromptWithMultiple
        ? PromptWithMultiple
        : Type extends PromptWithMinMax
          ? PromptWithMinMax
          : never;

type SinglePromptValue<
  Type extends PromptType,
  CType extends ChannelType = ChannelType,
> = Type extends 'string'
  ? string
  : Type extends 'number'
    ? number
    : Type extends 'boolean'
      ? boolean
      : Type extends 'channel'
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
        : Type extends 'role'
          ? Role
          : never;

type PromptValueResolver<
  Type extends PromptType,
  Multiple extends boolean = false,
  CType extends ChannelType = ChannelType,
> = Multiple extends true
  ? SinglePromptValue<Type, CType>[]
  : SinglePromptValue<Type, CType>;

type PromptValue<
  Required extends boolean,
  Type extends PromptType,
  Multiple extends boolean = false,
  CType extends ChannelType = ChannelType,
> = Required extends true
  ? PromptValueResolver<Type, Multiple, CType>
  : PromptValueResolver<Type, Multiple, CType> | null;

class PromptUtils {
  private constructor() {}

  public static readonly isPromptBase = (
    prompt: Prompt,
  ): prompt is PromptBase => {
    return (
      !PromptUtils.isPromptWithChoices(prompt) &&
      !PromptUtils.isPromptWithChannelTypes(prompt) &&
      !PromptUtils.isPromptWithMultiple(prompt) &&
      !PromptUtils.isPromptWithMinMax(prompt)
    );
  };

  public static readonly isPromptWithChoices = (
    prompt: Prompt,
  ): prompt is PromptWithChoices => {
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
    return 'multiple' in prompt;
  };

  public static readonly isPromptWithMinMax = (
    prompt: Prompt,
  ): prompt is PromptWithMinMax => {
    return (prompt.type === 'string' || prompt.type === 'number') as boolean;
  };

  // Handle single prompt
  public static readonly promptInteraction = async (
    interaction: RepliableInteraction<CacheType>,
    prompt: Prompt,
  ): Promise<PromptValue<true, PromptType, true> | null> => {};

  // Handle multiple prompts
  public static readonly handleInteraction = async (
    interaction: RepliableInteraction<CacheType>,
    prompts: Prompt[],
  ): Promise<Record<string, PromptValue<true, PromptType, true> | null>> => {};
}

export {
  PromptUtils,
  type PromptType,
  type PromptChoice,
  type PromptBase,
  type PromptWithChoices,
  type PromptWithChannelTypes,
  type PromptWithMultiple,
  type PromptWithMinMax,
  type Prompt,
  type CastPrompt,
  type PromptValue,
};
