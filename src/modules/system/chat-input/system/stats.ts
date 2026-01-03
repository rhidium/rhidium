import { Command } from '@core/commands/base';
import { CommandType } from '@core/commands/types';
import { Embeds } from '@core/config/embeds';
import { UnitConstants } from '@core/constants/units';
import { I18n } from '@core/i18n';
import { TimeUtils } from '@core/utils/common/time';
import { stripIndents } from 'common-tags';
import { version } from 'discord.js';

const discordVersion =
  version.indexOf('dev') < 0
    ? version
    : version.slice(0, version.indexOf('dev') + 3);
const discordVersionDocLink =
  'https://discord.js.org/#/docs/discord.js/main/general/welcome';
const nodeVersionDocLink = `https://nodejs.org/docs/latest-${process.version.split('.')[0]}.x/api/#`;

const StatsCommand = new Command({
  type: CommandType.ChatInputPlain,
  data: (builder) =>
    builder.setName('stats').setDescription('Get the bot statistics'),
  run: async ({ client, interaction }) => {
    // Latency
    const now = Date.now();
    const reply = await StatsCommand.reply(
      interaction,
      {
        content: I18n.localize('commands:stats.pinging', interaction),
      },
      true,
    );
    const roundTripLatency = reply.interaction.createdTimestamp - now;
    const apiLatency =
      (reply.resource?.message?.createdTimestamp ?? now) -
      reply.interaction.createdTimestamp;
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

    const websocketLatencyStr = I18n.localize(
      'commands:stats.statistics.websocketLatency',
      interaction,
    );
    const apiLatencyStr = I18n.localize(
      'commands:stats.statistics.apiLatency',
      interaction,
    );
    const roundTripLatencyStr = I18n.localize(
      'commands:stats.statistics.roundTripLatency',
      interaction,
    );
    const memoryUsageStr = I18n.localize(
      'commands:stats.statistics.memoryUsage',
      interaction,
    );
    const cacheSizeStr = I18n.localize(
      'commands:stats.statistics.cacheSize',
      interaction,
    );

    // Create our embed
    const embed = Embeds.primary({
      title: I18n.localize('commands:stats.statistics.statistics', interaction),
      fields: [
        {
          name: I18n.localize('commands:stats.statistics.latency', interaction),
          value: stripIndents`
            ${latencyEmoji(Math.round(client.ws.ping))} **${websocketLatencyStr}:** ${Math.round(client.ws.ping)}ms
            ${latencyEmoji(Math.round(apiLatency))} **${apiLatencyStr}:** ${Math.round(apiLatency)}ms
            ${latencyEmoji(roundTripLatency)} **${roundTripLatencyStr}:** ${Math.round(roundTripLatency)}ms
          `,
          inline: true,
        },
        {
          name: I18n.localize('commands:stats.statistics.memory', interaction),
          value: stripIndents`
            💾 **${memoryUsageStr}:** ${memoryUsedInMB.toFixed(2)}/${memoryAvailableInMB.toFixed(2)} MB 
            ♻️ **${cacheSizeStr}:** ${objCacheSizeInMB.toFixed(2)} MB
          `,
          inline: true,
        },
        {
          name: I18n.localize('commands:stats.statistics.uptime', interaction),
          value: `🕐 ${TimeUtils.humanReadableMs(client.uptime ?? 0)}`,
          inline: false,
        },
        {
          name: I18n.localize(
            'commands:stats.statistics.counts.label',
            interaction,
          ),
          value: [
            `👪 **${I18n.localize('commands:stats.statistics.counts.servers', interaction)}:** ${guildCount.toLocaleString()}`,
            `🙋 **${I18n.localize('commands:stats.statistics.counts.members', interaction)}:** ${memberCount.toLocaleString()}`,
            `#️⃣ **${I18n.localize('commands:stats.statistics.counts.channels', interaction)}:** ${channelCount.toLocaleString()}`,
            `🪪 **${I18n.localize('commands:stats.statistics.counts.roles', interaction)}:** ${roleCount.toLocaleString()}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: I18n.localize(
            'commands:stats.statistics.versions.label',
            interaction,
          ),
          value: stripIndents`
            ⚙️ **Discord.js ${I18n.localize('commands:stats.statistics.versions.version', interaction)}:** [v${discordVersion}](${discordVersionDocLink})
            ⚙️ **Node ${I18n.localize('commands:stats.statistics.versions.version', interaction)}:** [${process.version}](${nodeVersionDocLink})
          `,
          inline: true,
        },
      ],
    });

    await StatsCommand.reply(interaction, {
      content: '',
      embeds: [embed],
    });
  },
});

export default StatsCommand;
