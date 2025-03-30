import { PermLevel } from '@client/commands/permissions';
import { type CommandThrottleOptions, CommandThrottleType } from './throttle';
import type {
  CommandEnabledOptions,
  CommandInteractionOptions,
  CommandPermissionOptions,
} from './options';

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
    process.env.NODE_ENV === 'production'
      ? []
      : ['process.env.DEVELOPMENT_GUILD_ID'],
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
