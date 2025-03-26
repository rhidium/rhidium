import type { Client, RepliableInteraction, Snowflake } from 'discord.js';

interface RequiredResourceOptions {
  guilds: Snowflake[];
  channels: Snowflake[];
  roles: Snowflake[];
  users: Snowflake[];
  categories: Snowflake[];
}

type RequiredResourceMatcher<Interaction extends RepliableInteraction> = (
  client: Client,
  interaction: Interaction,
) => boolean;

type AsyncRequiredResourceMatcher<Interaction extends RepliableInteraction> = (
  client: Client,
  interaction: Interaction,
) => Promise<boolean>;

type AbstractRequiredResources<Interaction extends RepliableInteraction> =
  RequiredResourceOptions & {
    matchGuilds: RequiredResourceMatcher<Interaction>;
    matchChannels: RequiredResourceMatcher<Interaction>;
    matchRoles: RequiredResourceMatcher<Interaction>;
    matchUsers: RequiredResourceMatcher<Interaction>;
    matchCategories: RequiredResourceMatcher<Interaction>;
    match: RequiredResourceMatcher<Interaction>;

    handleMatchGuilds: AsyncRequiredResourceMatcher<Interaction>;
    handleMatchChannels: AsyncRequiredResourceMatcher<Interaction>;
    handleMatchRoles: AsyncRequiredResourceMatcher<Interaction>;
    handleMatchUsers: AsyncRequiredResourceMatcher<Interaction>;
    handleMatchCategories: AsyncRequiredResourceMatcher<Interaction>;
    handleMatch: AsyncRequiredResourceMatcher<Interaction>;
  };

export {
  type RequiredResourceOptions,
  type RequiredResourceMatcher,
  type AbstractRequiredResources,
};
