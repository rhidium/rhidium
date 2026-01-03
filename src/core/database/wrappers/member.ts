import { Model } from '../models';
import { type PopulatedGuild, type PopulatedMember } from '../select';
import { guildWrapper } from './guild';
import { userWrapper } from './user';
import { DatabaseWrapper } from './wrapper';

interface FindMemberOptions {
  userId: string;
  guildId: string;
  resolveUser?: boolean;
  resolveGuild?: boolean;
}

class MemberWrapper extends DatabaseWrapper<Model.Member> {
  constructor() {
    super(Model.Member);
  }

  readonly resolve = async (
    options: FindMemberOptions,
  ): Promise<PopulatedMember> => {
    const {
      userId,
      guildId,
      resolveGuild = true,
      resolveUser = true,
    } = options;

    const member = await this.findUnique({
      GuildId_UserId: {
        GuildId: guildId,
        UserId: userId,
      },
    });

    const guildPromise = resolveGuild
      ? guildWrapper.resolve(guildId)
      : Promise.resolve(null);
    const userPromise = resolveUser
      ? userWrapper.resolve(userId)
      : Promise.resolve(null);

    await Promise.all([guildPromise, userPromise]);

    const resolvedMember =
      member ?? (await this.create({ GuildId: guildId, UserId: userId }));

    return resolvedMember;
  };

  readonly resolveAndReturnGuild = async (
    options: FindMemberOptions,
  ): Promise<[PopulatedMember, PopulatedGuild]> => {
    const {
      userId,
      guildId,
      resolveGuild = true,
      resolveUser = true,
    } = options;

    const member = await this.findUnique({
      GuildId_UserId: {
        GuildId: guildId,
        UserId: userId,
      },
    });

    const guildPromise = resolveGuild
      ? guildWrapper.resolve(guildId)
      : Promise.resolve(null);
    const userPromise = resolveUser
      ? userWrapper.resolve(userId)
      : Promise.resolve(null);

    const [guild] = await Promise.all([guildPromise, userPromise]);

    const resolvedMember =
      member ?? (await this.create({ GuildId: guildId, UserId: userId }));

    return [
      resolvedMember,
      guild ?? (await guildWrapper.resolve(guildId)),
    ] as const;
  };
}

const memberWrapper = new MemberWrapper();

export { memberWrapper, type FindMemberOptions };
