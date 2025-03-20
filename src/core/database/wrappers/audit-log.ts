import type { Guild, Prisma } from '@prisma/client';
import type { Client } from '../../client';
import { ObjectUtils, PermissionUtils, TimeUtils } from '../../utils';
import { Model } from '../models';
import type { PopulatedAuditLog } from '../select';
import { DatabaseWrapper } from './wrapper';
import { EmbedBuilder, MessageCreateOptions, MessagePayload } from 'discord.js';
import { guildWrapper } from './guild';

enum AuditLogType {
  AUDIT_LOG_CHANNEL_DISABLED = 'AUDIT_LOG_CHANNEL_DISABLED',
  AUDIT_LOG_CHANNEL_CHANGED = 'AUDIT_LOG_CHANNEL_CHANGED',
  ADMIN_ROLE_CHANGED = 'ADMIN_ROLE_CHANGED',
  ADMIN_ROLE_REMOVED = 'ADMIN_ROLE_REMOVED',
  MEMBER_JOIN_CHANNEL_DISABLED = 'MEMBER_JOIN_CHANNEL_DISABLED',
  MEMBER_JOIN_CHANNEL_CHANGED = 'MEMBER_JOIN_CHANNEL_CHANGED',
  GUILD_SETTINGS_UPDATE = 'GUILD_SETTINGS_UPDATE',
  GUILD_SETTINGS_RESET = 'GUILD_SETTINGS_RESET',
}

type AuditLogOptions = {
  /**
   * The client to use for logging, needs to be logged in/ready.
   */
  readonly client: Client<true>;
  /**
   * The type of operation that is being performed.
   */
  readonly type: AuditLogType;
  /**
   * The user who initiated the operation.
   */
  readonly user: string;
  /**
   * The date the operation was performed, defaults to "now".
   */
  readonly date?: Date;
  /**
   * The data for the operation. If the before/after properties are present,
   * the audit log will be presented as a settings change.
   */
  readonly data:
    | Prisma.JsonValue
    | Prisma.InputJsonValue
    | Prisma.JsonNullValueInput
    | {
        before: Guild;
        after: Guild;
      };
  /**
   * The guild this operation is taking place in, if any.
   */
  readonly guild?: Guild;
  /**
   * A function to run after the audit log has been created.
   */
  readonly onFinish?: (log: PopulatedAuditLog) => void;
};

class AuditLogWrapper extends DatabaseWrapper<Model.AuditLog> {
  public constructor() {
    super(Model.AuditLog);
  }

  public readonly isSettingsChange = (
    data: AuditLogOptions['data'],
  ): data is { before: Guild; after: Guild } => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'before' in data &&
      'after' in data
    );
  };

  private readonly onCreate = async (
    client: Client<true>,
    log: PopulatedAuditLog,
  ) => {
    if (!log.GuildId) return;

    const guild = await guildWrapper.resolve(log.GuildId);
    const sharedFields = [
      {
        name: 'Type',
        value: log.type,
        inline: true,
      },
      {
        name: 'User',
        value: `<@${log.UserId}> (\`${log.UserId}\`)`,
        inline: true,
      },
      {
        name: 'Date',
        value: TimeUtils.discordInfoTimestamp(log.date.valueOf()),
        inline: true,
      },
    ];

    if (this.isSettingsChange(log.data)) {
      const diff = ObjectUtils.diffAsChanges(log.data.before, log.data.after);

      await this.discordLog(client, guild, {
        embeds: [
          client.embeds.info({
            title: 'Settings have been changed',
            fields: [
              ...sharedFields,
              {
                name: 'Changes',
                value: diff
                  .map((change) => {
                    return `- **${change.key}**: ${change.oldValue} -> ${change.newValue}`;
                  })
                  .join('\n'),
                inline: false,
              },
            ],
            footer: {
              text: `Audit Id: ${log.id}`,
            },
          }),
        ],
      });
    } else {
      await this.discordLog(client, guild, {
        embeds: [
          client.embeds.info({
            title: 'Audit Logging',
            fields: [
              ...sharedFields,
              {
                name: 'Action/Operation Data',
                value: log.data?.toString() ?? 'No data was attached.',
                inline: false,
              },
            ],
            footer: {
              text: `Audit Id: ${log.id}`,
            },
          }),
        ],
      });
    }
  };

  private readonly discordLog = async (
    client: Client<true>,
    guild: Guild,
    message: string | MessagePayload | MessageCreateOptions | EmbedBuilder,
  ) => {
    if (!guild.auditLogChannelId) return;

    const adminLogChannel = client.guilds.cache
      .get(guild.id)
      ?.channels.cache.get(guild.auditLogChannelId);

    if (!adminLogChannel || !adminLogChannel.isTextBased()) return;

    if (
      PermissionUtils.hasChannelPermissions(client.user.id, adminLogChannel, [
        PermissionUtils.FLAGS.SendMessages,
        PermissionUtils.FLAGS.EmbedLinks,
      ]) !== true
    ) {
      return;
    }

    await adminLogChannel.send(
      message instanceof EmbedBuilder ? { embeds: [message] } : message,
    );
  };

  public readonly util = async (
    options: AuditLogOptions,
  ): Promise<PopulatedAuditLog> => {
    const { type, user, date = new Date(), data, guild } = options;

    this.debug('Creating audit log with options: %o', options);

    return await this.create({
      type,
      data: data === null ? JSON.stringify(null) : data,
      date,
      GuildId: guild?.id,
      UserId: user,
    }).then((record) => {
      void this.onCreate(options.client, record);

      if (options.onFinish) {
        options.onFinish(record);
      }

      return record;
    });
  };
}

const auditLogWrapper = new AuditLogWrapper();

export { auditLogWrapper, type AuditLogOptions, AuditLogType };
