import {
  BaseInteraction,
  DMChannel,
  Guild,
  GuildBasedChannel,
  GuildMember,
} from 'discord.js';

export type AvailableGuildInteraction<
  I extends BaseInteraction = BaseInteraction<'cached'>,
> = I & {
  guild: Guild & {
    available: true;
  };
  guildId: string;
  channel: GuildBasedChannel | null;
  member: GuildMember;
};

export type DMInteraction<
  I extends BaseInteraction = BaseInteraction<'cached'>,
> = I & {
  guild: null;
  guildId: null;
  channel: DMChannel;
  member: null;
};
