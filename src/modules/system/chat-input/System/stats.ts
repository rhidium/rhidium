import { Lang, ChatInputCommand, TimeUtils, UnitConstants } from '@core';
import { stripIndents } from 'common-tags';
import { getInfo } from 'discord-hybrid-sharding';
import { SlashCommandBuilder, version } from 'discord.js';

const discordVersion =
  version.indexOf('dev') < 0
    ? version
    : version.slice(0, version.indexOf('dev') + 3);
const discordVersionDocLink =
  'https://discord.js.org/#/docs/discord.js/main/general/welcome';
const nodeVersionDocLink = `https://nodejs.org/docs/latest-${process.version.split('.')[0]}.x/api/#`;

const StatsCommand = new ChatInputCommand({
  aliases: ['ping'],
  data: new SlashCommandBuilder(),
  run: async (client, interaction) => {
    // Latency
    const reply = await interaction.reply({
      content: Lang.t('commands:stats.pinging'),
      withResponse: true,
    });
    const fullCircleLatency =
      reply.interaction.createdTimestamp - interaction.createdTimestamp;
    const latencyEmoji = (ms: number) => {
      let emoji;
      if (ms < 150) emoji = '🟢';
      else if (ms < 250) emoji = '🟡';
      else emoji = '🔴';
      return emoji;
    };

    // Counts
    const guildCount = client.guilds.cache.size;
    const memberCount = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0,
    );
    const channelCount = client.channels.cache.size;
    const roleCount = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.roles.cache.size,
      0,
    );

    // Memory
    const memoryUsage = process.memoryUsage();
    const memoryUsedInMB =
      memoryUsage.heapUsed /
      UnitConstants.BYTES_IN_KIB /
      UnitConstants.BYTES_IN_KIB;
    const memoryAvailableInMB =
      memoryUsage.heapTotal /
      UnitConstants.BYTES_IN_KIB /
      UnitConstants.BYTES_IN_KIB;
    const objCacheSizeInMB =
      memoryUsage.external /
      UnitConstants.BYTES_IN_KIB /
      UnitConstants.BYTES_IN_KIB;

    const apiLatencyStr = Lang.t('general:system.apiLatency');
    const fullCircleLatencyStr = Lang.t('general:system.fullCircleLatency');
    const memoryUsageStr = Lang.t('general:system.memoryUsage');
    const cacheSizeStr = Lang.t('general:system.cacheSize');

    // Create our embed
    const embed = client.embeds.branding({
      title: Lang.t('general:statistics'),
      fields: [
        {
          name: Lang.t('general:system.latency'),
          value: stripIndents`
          ${latencyEmoji(Math.round(client.ws.ping))} **${apiLatencyStr}:** ${Math.round(client.ws.ping)}ms
          ${latencyEmoji(fullCircleLatency)} **${fullCircleLatencyStr}:** ${Math.round(fullCircleLatency)}ms
        `,
          inline: true,
        },
        {
          name: Lang.t('general:system.memory'),
          value: stripIndents`
          💾 **${memoryUsageStr}:** ${memoryUsedInMB.toFixed(2)}/${memoryAvailableInMB.toFixed(2)} MB 
          ♻️ **${cacheSizeStr}:** ${objCacheSizeInMB.toFixed(2)} MB
        `,
          inline: true,
        },
        {
          name: Lang.t('general:system.uptime'),
          value: `🕐 ${TimeUtils.msToHumanReadable(client.uptime ?? 0)}`,
          inline: false,
        },
        {
          name: Lang.t('general:counts.label'),
          value: [
            `👪 **${Lang.t('general:counts.servers')}:** ${guildCount.toLocaleString()}`,
            `🙋 **${Lang.t('general:counts.members')}:** ${memberCount.toLocaleString()}`,
            `#️⃣ **${Lang.t('general:counts.channels')}:** ${channelCount.toLocaleString()}`,
            `🪪 **${Lang.t('general:counts.roles')}:** ${roleCount.toLocaleString()}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: Lang.t('general:system.label'),
          value: stripIndents`
          ⚙️ **Discord.js ${Lang.t('general:system.version')}:** [v${discordVersion}](${discordVersionDocLink})
          ⚙️ **Node ${Lang.t('general:system.version')}:** [${process.version}](${nodeVersionDocLink})
        `,
          inline: true,
        },
      ],
    });

    // Let's not forget about our clustering/sharding information
    if (client.cluster) {
      let shardsOutput;
      try {
        const shardStatuses = await client.cluster.broadcastEval((ctx) => {
          return {
            shards: ctx.cluster ? [...ctx.cluster.ids.keys()].length : 0,
            readyAt: ctx.readyAt,
          };
        });
        const shardStatusArr = shardStatuses.map(({ shards, readyAt }) => {
          if (shards === 0) return '🟥'.repeat(shards);
          if (!readyAt) return '🟨'.repeat(shards);
          return '🟩'.repeat(shards);
        });
        if (shardStatusArr.length < getInfo().TOTAL_SHARDS) {
          shardStatusArr.push(
            ...Array(getInfo().TOTAL_SHARDS - shardStatusArr.length).fill('🟥'),
          );
        }
        shardsOutput = stripIndents`
          ${shardStatusArr.join('')}

          🟩 = ${Lang.t('general:shards.onlineAndResponsive')}
          🟨 = ${Lang.t('general:shards.spawnedButNotReady')}
          🟥 = ${Lang.t('general:shards.unavailable')}
        `;
      } catch {
        shardsOutput = Lang.t('general:shards.busySpawning');
      }

      const totalMemberCount = client.cluster
        ? await client.cluster
            .broadcastEval((c) =>
              c.guilds.cache.reduce((a, b) => a + (b.memberCount ?? 0), 0),
            )
            .then((results) => results.reduce((prev, val) => prev + val, 0))
        : client.guilds.cache.reduce((a, b) => a + (b.memberCount ?? 0), 0);
      const totalGuildCount = client.cluster
        ? await client.cluster
            .broadcastEval((c) => c.guilds.cache.size)
            .then((results) => results.reduce((prev, val) => prev + val, 0))
        : client.guilds.cache.size;
      embed.addFields(
        {
          name: '\u200b',
          value: '\u200b',
          inline: false,
        },
        {
          name: Lang.t('general:cluster.label'),
          value: stripIndents`
          📡 **${Lang.t('general:cluster.shards')}:** ${getInfo().TOTAL_SHARDS.toLocaleString()}
          📡 **${Lang.t('general:cluster.clusters')}:** ${client.cluster.count.toLocaleString()}
          🙋 **${Lang.t('general:cluster.totalMembers')}:** ${totalMemberCount.toLocaleString()}
          👪 **${Lang.t('general:cluster.totalGuilds')}:** ${totalGuildCount.toLocaleString()}
        `,
          inline: true,
        },
        {
          name: Lang.t('general:cluster.shardStatus'),
          value: shardsOutput,
          inline: true,
        },
      );
    }

    // Reply with our embed
    await StatsCommand.reply(interaction, {
      content: '',
      embeds: [embed],
    });
  },
});

export default StatsCommand;
