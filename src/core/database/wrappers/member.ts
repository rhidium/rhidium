import { Model } from '../models';
import { PopulatedMember } from '../select';
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

  readonly resolve = async ({
    userId,
    guildId,
    resolveGuild = true,
    resolveUser = true,
  }: FindMemberOptions): Promise<PopulatedMember> => {
    const member = await this.findUnique({
      GuildId_UserId: {
        GuildId: guildId,
        UserId: userId,
      },
    });

    if (member) return member;

    await Promise.all([
      resolveGuild ? guildWrapper.resolve(guildId) : null,
      resolveUser ? userWrapper.resolve(userId) : null,
    ]);

    return this.create({
      GuildId: guildId,
      UserId: userId,
    });
  };
}

const memberWrapper = new MemberWrapper();

export { memberWrapper, type FindMemberOptions };
