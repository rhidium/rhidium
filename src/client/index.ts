import './shared';

import { stripIndents } from 'common-tags';
import { ClusterManager } from 'discord-hybrid-sharding';
import { existsSync } from 'fs';
import path from 'path';
import { main } from './client';
import { Lang } from 'lib/i18n';
import { appConfig } from './config';

// Make sure we're not using ts-node-dev when clustering
if (process.env.TS_NODE_DEV === 'true' && appConfig.cluster.enabled) {
  // I'm not exactly sure if there's a way to make this work,
  // or if the issue is with discord-hybrid-sharding, ts-node-dev,
  // or our ts config altogether (and/or package type)
  throw new Error(
    [
      'The package "discord-hybrid-sharding" does not currently work with ts-node-dev,',
      'please create a dedicated build to run cluster.',
    ].join(' '),
  );
}

// Try to use source-code file if it exists
// Otherwise, use compiled file
const sourcePath = path.resolve(__dirname, './client.ts');
const botFilePath = existsSync(sourcePath)
  ? sourcePath
  : path.resolve(__dirname, './client.js');

// If clustering is not enabled,
// or we're in development mode, (ts-node-dev doesn't play well with discord-hybrid-sharding)
// just start the bot normally
if (appConfig.cluster.enabled === false) {
  void main();
}

// Otherwise, start the cluster manager
else {
  const manager = new ClusterManager(botFilePath, {
    ...appConfig.cluster,
    token: appConfig.client.token,
    totalShards: appConfig.cluster.total_shards ?? 'auto',
    shardsPerClusters: appConfig.cluster.shards_per_clusters,
    totalClusters: appConfig.cluster.total_clusters ?? 'auto',
    mode: appConfig.cluster.mode,
    respawn: appConfig.cluster.respawn,
    restarts: {
      max: appConfig.cluster.restarts.max,
      interval: appConfig.cluster.restarts.interval,
    },
    shardArgs: [
      // Always overwrite shard node_env for consistency
      `--NODE_ENV=${appConfig.NODE_ENV}`,
      '--INITIALIZE=true',
    ],
  });

  manager.on('clusterCreate', (cluster) => {
    console.info(stripIndents`--------------------------------------------------------
  
      ${Lang.t('client:clustering.cluster.launch', { id: cluster.id })}
  
      --------------------------------------------------------`);
  });
  void manager.spawn({ timeout: -1 });
}
