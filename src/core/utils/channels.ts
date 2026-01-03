import { logger } from '@core/logger';
import {
  Collection,
  Guild,
  type GuildBasedChannel,
  Message,
  type Snowflake,
  type TextBasedChannel,
} from 'discord.js';

const Logger = logger();

type ChannelWithMessages = GuildBasedChannel & TextBasedChannel;
type MessageList = Collection<Snowflake, Message<true>>;
type MessageLists = Collection<Snowflake, MessageList>;
type DeleteMessagesResult = Record<Snowflake, number>;

class ChannelUtils {
  static readonly fetchMessages = async (
    guild: Guild,
    includeChannel?: (channel: ChannelWithMessages) => boolean,
    includeMessage?: (message: Message) => boolean,
    fetchMoreForChannel?: (
      channel: ChannelWithMessages,
      lastMessage: Message,
      messages: MessageList,
    ) => boolean,
    stopCondition?: () => boolean,
  ): Promise<MessageLists> => {
    const channels = guild.channels.cache
      .filter((channel) => channel.isTextBased())
      .map((channel) => channel as ChannelWithMessages);

    const messages = new Collection<string, MessageList>();

    for await (const channel of channels) {
      if (includeChannel && !includeChannel(channel)) break;

      const collection = new Collection<string, Message<true>>();
      const fetchedMessages = await ChannelUtils.fetchChannelMessages(
        channel,
        includeMessage,
        (lastMessage) => {
          if (!fetchMoreForChannel) return false;

          return fetchMoreForChannel(channel, lastMessage, collection);
        },
        undefined,
        collection,
      );

      messages.set(channel.id, fetchedMessages);

      if (stopCondition && stopCondition()) break;
    }

    return messages;
  };

  static readonly fetchChannelMessages = async (
    channel: ChannelWithMessages,
    includeMessage?: (message: Message) => boolean,
    fetchMore?: (lastMessage: Message) => boolean,
    before?: string,
    collectedMessages = new Collection<string, Message<true>>(),
  ): Promise<MessageList> => {
    try {
      const messages = await channel.messages.fetch({
        limit: 100,
        before,
      });

      if (!messages.size) {
        return collectedMessages;
      }

      messages.forEach((msg) => {
        if (!includeMessage || includeMessage(msg)) {
          collectedMessages.set(msg.id, msg);
        }
      });

      const lastMessage = messages.last();

      if (lastMessage) {
        if (fetchMore && !fetchMore(lastMessage)) {
          return collectedMessages;
        }

        return await this.fetchChannelMessages(
          channel,
          includeMessage,
          fetchMore,
          lastMessage.id,
          collectedMessages,
        );
      }

      return collectedMessages;
    } catch (error) {
      Logger.error(
        `Failed to fetch messages in channel ${channel.id}: ${error}`,
      );
      return collectedMessages;
    }
  };

  static readonly deleteMessages = async (
    guild: Guild,
    messageLists: MessageLists,
  ): Promise<DeleteMessagesResult> => {
    const deletedMessages: Record<string, number> = {};

    for await (const [channelId, messages] of messageLists) {
      const channel = guild.channels.cache.get(channelId);

      if (!channel || !channel.isTextBased()) continue;

      try {
        await channel.bulkDelete(messages);
        deletedMessages[channelId] = messages.size;
      } catch (error) {
        Logger.error(
          `Failed to delete messages in channel ${channelId}: ${error}`,
        );
      }
    }

    return deletedMessages;
  };

  static readonly parseDeleteMessagesResult = (
    result: DeleteMessagesResult,
    callback?: (channelId: Snowflake, deletedCount: number) => void,
  ): string => {
    return Object.entries(result)
      .filter(([, deletedCount]) => deletedCount > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([channelId, deletedCount]) => {
        if (callback) {
          callback(channelId, deletedCount);
        }
        return `- Deleted ${deletedCount} messages in <#${channelId}>`;
      })
      .join('\n');
  };
}

export {
  ChannelUtils,
  type ChannelWithMessages,
  type MessageList,
  type MessageLists,
  type DeleteMessagesResult,
};
