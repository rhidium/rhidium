import { Client, ClusterUtils } from '@rhidium/core';
import { ActivityType } from 'discord.js';

const updateServerCount = async (client: Client<true>): Promise<number> => {
  if (ClusterUtils.hasCluster(client)) {
    const results = await client.cluster.broadcastEval((c) => {
      const serverCount = c.guilds.cache.size;
      const shardIds = c.cluster ? [...c.cluster.ids.keys()] : [];
      if (!c.user) return 0;
      c.user.presence.set({
        status: 'online',
        activities: [
          {
            name: `${serverCount.toLocaleString()} server${serverCount === 1 ? '' : 's'}`,
            type: 3, // Can't use ActivityType.Watching here because of broadcastEval
          },
        ],
        shardId: shardIds,
      });
      return serverCount;
    });
    return results.reduce((acc, val) => acc + val, 0);
  } else {
    const serverCount = client.guilds.cache.size;
    client.user.setActivity(
      `${serverCount.toLocaleString()} server${serverCount === 1 ? '' : 's'}`,
      { type: ActivityType.Watching },
    );
    return serverCount;
  }
};

export class ClusterServices {
  static readonly updateServerCount = updateServerCount;
}
