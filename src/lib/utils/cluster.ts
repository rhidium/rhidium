import { Client, ClientWithCluster } from '../client';
import {
  APIChannel,
  APIGuild,
  APIRole,
  APIGuildMember,
  Snowflake,
  APIUser,
} from 'discord.js';

export interface FetchResourceOptions {
  force: boolean;
  cache: boolean;
  allowUnknownGuild: boolean;
}

export enum FindResourceAccessor {
  CHANNEL = 'channels',
  GUILD = 'guilds',
  ROLE = 'roles',
  MEMBER = 'members',
  USER = 'users',
}

export type ResourceTypeMap = {
  [FindResourceAccessor.CHANNEL]: APIChannel;
  [FindResourceAccessor.GUILD]: APIGuild;
  [FindResourceAccessor.ROLE]: APIRole;
  [FindResourceAccessor.MEMBER]: APIGuildMember;
  [FindResourceAccessor.USER]: APIUser;
};

// Define a conditional type to map accessors to their return types
export type ReturnTypeForAccessor<T extends FindResourceAccessor> =
  T extends FindResourceAccessor.CHANNEL
    ? APIChannel
    : T extends FindResourceAccessor.GUILD
      ? APIGuild
      : T extends FindResourceAccessor.ROLE
        ? APIRole
        : T extends FindResourceAccessor.MEMBER
          ? APIGuildMember
          : T extends FindResourceAccessor.USER
            ? APIUser
            : null;

const requireCluster = (client: Client): ClientWithCluster => {
  if (!hasCluster(client)) {
    throw new Error('Cluster is not enabled.');
  }
  return client;
};

const hasCluster = (client: Client): client is ClientWithCluster => {
  return !!client.cluster;
};

/**
 * Find a resource across all clusters. This is useful for
 * finding resources that are not cached on the current cluster.
 *
 * Note: You can provide any Type for T, but you should consider
 * only using the API types (e.g. APIChannel, APIGuild, APIRole, etc.)
 * as functions etc. aren't preserved in broadcast eval
 *
 * @param client The client to use
 * @param id The id of the resource to find
 * @param accessor The accessor to use
 * @param fetchOptions The fetch options to use
 * @returns The resource if found, otherwise undefined
 */
const findResource = async <
  T extends APIChannel | APIGuild | APIRole | APIGuildMember | APIGuildMember,
>(
  client: Client,
  id: Snowflake,
  accessor: FindResourceAccessor,
  fetchOptions: FetchResourceOptions = {
    force: false,
    cache: false,
    allowUnknownGuild: false,
  },
) => {
  const clientWithCluster = requireCluster(client);

  try {
    const result = await clientWithCluster.cluster.broadcastEval(
      async (c, { id, accessor, FindResourceAccessor, fetchOptions }) => {
        switch (accessor) {
          case FindResourceAccessor.ROLE: {
            const guilds = c.guilds.cache.filter((g) => g.roles.cache.has(id));
            const guild = guilds.find(
              async (g) => await g.roles.fetch(id, fetchOptions),
            );
            const role = guild?.roles.cache.get(id);
            return role;
          }
          case FindResourceAccessor.MEMBER: {
            const guilds = c.guilds.cache.filter((g) =>
              g.members.cache.has(id),
            );
            guilds.find(
              async (g) =>
                await g.members.fetch({
                  ...fetchOptions,
                  user: id,
                }),
            );
            const member = guilds
              .map((g) => g.members.cache.get(id))
              .find((m) => m);
            return member;
          }
          case FindResourceAccessor.CHANNEL:
          case FindResourceAccessor.GUILD:
          case FindResourceAccessor.USER:
          default:
            await c[accessor].fetch(id, fetchOptions);
            return c[accessor].cache.get(id);
        }
      },
      { context: { id, accessor, FindResourceAccessor, fetchOptions } },
    );

    const firstTruthyItem = result.find((e) => e);
    return firstTruthyItem as T;
  } catch (error) {
    client.logger.error(
      'Error encountered while resolving resource across clusters',
      error,
    );
    return undefined;
  }
};

export class ClusterUtils {
  static requireCluster = requireCluster;
  static hasCluster = hasCluster;
  static findResource = findResource;
}
