import { Model } from '../models';
import { PopulatedGuild, PopulatedMember } from '../select';
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

  // @ts-expect-error - Insufficient overlap for tuple type
  readonly resolve: {
    (options: FindMemberOptions, returnGuild?: false): Promise<PopulatedMember>;
    (
      options: FindMemberOptions,
      returnGuild: true,
    ): Promise<[PopulatedMember, PopulatedGuild]>;
  } = async (
    options: FindMemberOptions,
    returnGuild = false,
  ): Promise<PopulatedMember | [PopulatedMember, PopulatedGuild]> => {
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

    if (returnGuild) {
      return [resolvedMember, guild ?? (await guildWrapper.resolve(guildId))]; // Enforce tuple return
    }

    return resolvedMember;
  };
}

const memberWrapper = new MemberWrapper();

export { memberWrapper, type FindMemberOptions };
