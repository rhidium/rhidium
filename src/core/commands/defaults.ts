import { PermLevel } from '@core/commands/permissions';
import { type CommandThrottleOptions, CommandThrottleType } from './throttle';
import type {
  CommandEnabledOptions,
  CommandInteractionOptions,
  CommandPermissionOptions,
} from './options';
import { appConfig } from '@core/config';

const permissions: CommandPermissionOptions = {
  level: PermLevel.User,
  client: [],
  user: [],
  whitelist: {
    guilds: [],
    channels: [],
    roles: [],
    users: [],
    categories: [],
  },
  defaultMemberPermissions: undefined,
} as const;

const throttle: CommandThrottleOptions = {
  enabled: true,
  limit: 2,
  duration: 5,
  type: CommandThrottleType.User,
} as const;

const interactions: CommandInteractionOptions<false> = {
  deferReply: false,
  replyEphemeral: false,
  refuseUncached: false,
} as const;

const enabled: CommandEnabledOptions<false> = {
  global: true,
  nsfw: false,
  guildOnly: false,
  guilds:
    process.env.NODE_ENV === 'production' ||
    !appConfig.client.development_server_id
      ? []
      : [appConfig.client.development_server_id],
  dm: false,
  privateChannel: false,
} as const;

const commandDefaults = {
  permissions,
  throttle,
  interactions,
  enabled,
};

export default commandDefaults;
