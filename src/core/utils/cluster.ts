import { Client, ClientWithCluster } from '../client';
import {
  APIChannel,
  APIGuild,
  APIRole,
  APIGuildMember,
  Snowflake,
  APIUser,
} from 'discord.js';

const requireCluster = (client: Client): ClientWithCluster => {
  if (!hasCluster(client)) {
    throw new Error('Cluster is not enabled.');
  }
  return client;
};

const hasCluster = (client: Client): client is ClientWithCluster => {
  return !!client.cluster;
};

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

/**
 * Options to fetch cluster resources with
 */
type FetchResourceOptions = {
  force: boolean;
  cache: boolean;
  allowUnknownGuild: boolean;
};

/**
 * Available accessors to find resources
 */
enum FindResourceAccessor {
  CHANNEL = 'channels',
  GUILD = 'guilds',
  ROLE = 'roles',
  MEMBER = 'members',
  USER = 'users',
}

/**
 * Type to map accessors to their respective (API) resources
 */
type ResourceTypeMap = {
  [FindResourceAccessor.CHANNEL]: APIChannel;
  [FindResourceAccessor.GUILD]: APIGuild;
  [FindResourceAccessor.ROLE]: APIRole;
  [FindResourceAccessor.MEMBER]: APIGuildMember;
  [FindResourceAccessor.USER]: APIUser;
};

/**
 * Conditional type to map accessors to their return types
 */
type AccessorReturnType<T extends FindResourceAccessor> =
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

class ClusterUtils {
  /**
   * Assert that the client has a cluster attached/available
   * @param client The client to check
   * @returns The client with cluster attached
   */
  static requireCluster = requireCluster;
  /**
   * Type guard that checks if the client has a cluster available
   * @param client The client to check the cluster for
   * @returns Whether the client has a cluster attached
   */
  static hasCluster = hasCluster;
  /**
   * Find a resource across all clusters
   * @param client The client to use
   * @param id The id of the resource to find
   * @param accessor The accessor/resource-type to use
   * @param fetchOptions The fetch options to use
   * @returns The resource if found, if any
   */
  static findResource = findResource;
}

export {
  ClusterUtils,
  type FetchResourceOptions,
  FindResourceAccessor,
  type ResourceTypeMap,
  type AccessorReturnType,
};
