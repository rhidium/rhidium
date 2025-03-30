import {
  BitFieldResolvable,
  EmbedBuilder,
  InteractionCallbackResponse,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  InteractionType,
  Message,
  MessageFlags,
  MessageFlagsString,
  RepliableInteraction,
} from 'discord.js';

type DynamicInteractionFlags =
  | BitFieldResolvable<
      Extract<MessageFlagsString, 'SuppressEmbeds'>,
      MessageFlags.SuppressEmbeds
    >
  | undefined;

type InternalDynamicContent = Omit<
  InteractionReplyOptions & InteractionEditReplyOptions,
  'flags'
> & {
  flags?: DynamicInteractionFlags;
  /**
   * Whether to prefer follow-up messages over other types of replies.
   * If set to true, and the interaction is a message component interaction,
   * the interaction will be updated instead of replied to.
   */
  preferUpdate?: boolean;
};

type DynamicContent = string | EmbedBuilder | InternalDynamicContent;

type WithResponseContent<T extends boolean> = Omit<
  T extends true ? InteractionReplyOptions : DynamicContent,
  'ephemeral'
>;

class ResponseContent {
  public constructor(
    public content: WithResponseContent<boolean>,
    public ephemeral = false,
    public withResponse = false,
  ) {}
}

type WithResponseType<T extends boolean> = T extends true
  ? InteractionCallbackResponse
  : Message | InteractionResponse;

class InteractionUtils {
  public static readonly isAcknowledged = <T extends RepliableInteraction>(
    interaction: T,
  ) =>
    interaction.isRepliable() && (interaction.replied || interaction.deferred);

  public static readonly isResponseContent = (
    content: unknown,
  ): content is WithResponseContent<boolean> => {
    if (typeof content === 'string') return true;
    if (content instanceof EmbedBuilder) return true;
    if (content instanceof ResponseContent) return true;

    return false;
  };

  public static readonly replyDynamic = async <
    I extends RepliableInteraction,
    WithResponse extends boolean = false,
  >(
    interaction: I,
    content: WithResponseContent<WithResponse>,
    ephemeral = true,
    withResponse?: WithResponse,
  ): Promise<WithResponseType<WithResponse>> => {
    const castResponse = (
      response: Promise<
        Message | InteractionResponse | InteractionCallbackResponse
      >,
    ) => response as Promise<WithResponseType<WithResponse>>;

    if (withResponse) {
      return castResponse(
        interaction.reply({
          ...(content as InteractionReplyOptions),
          flags: ephemeral ? [MessageFlags.Ephemeral] : [],
          withResponse: true,
        }),
      );
    }

    const castContent = content as DynamicContent;

    const resolvedContent: InternalDynamicContent =
      typeof castContent === 'string'
        ? { content: castContent }
        : castContent instanceof EmbedBuilder
          ? { embeds: [castContent] }
          : castContent;

    if (InteractionUtils.isAcknowledged(interaction)) {
      if (
        resolvedContent.preferUpdate &&
        interaction.type === InteractionType.MessageComponent
      ) {
        return castResponse(interaction.update(resolvedContent));
      }

      return castResponse(interaction.editReply(resolvedContent));
    }

    return castResponse(
      interaction.reply({
        ...resolvedContent,
        flags: ephemeral ? [MessageFlags.Ephemeral] : [],
        withResponse: false,
      }),
    );
  };
}

export {
  ResponseContent,
  InteractionUtils,
  type WithResponseContent,
  type DynamicContent,
  type DynamicInteractionFlags,
  type WithResponseType,
};
