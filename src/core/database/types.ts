import type { Prisma } from '@prisma/client';
import type { prismaClient } from './client';
import {
  populatedCommandCooldown,
  populatedCommandStatistics,
  populatedGuild,
  populatedMember,
  populatedUser,
  populatedAuditLog,
} from './select';

export const populateModelArgs = {
  User: populatedUser,
  Member: populatedMember,
  Guild: populatedGuild,
  CommandCooldown: populatedCommandCooldown,
  CommandStatistics: populatedCommandStatistics,
  AuditLog: populatedAuditLog,
};

//
// Start Create Args
//

export type ModelCreateArgs = {
  User: Prisma.UserCreateArgs;
  Member: Prisma.MemberCreateArgs;
  Guild: Prisma.GuildCreateArgs;
  CommandCooldown: Prisma.CommandCooldownCreateArgs;
  CommandStatistics: Prisma.CommandStatisticsCreateArgs;
  AuditLog: Prisma.AuditLogCreateArgs;
};

export type ModelCreateManyArgs = {
  User: Prisma.UserCreateManyArgs;
  Member: Prisma.MemberCreateManyArgs;
  Guild: Prisma.GuildCreateManyArgs;
  CommandCooldown: Prisma.CommandCooldownCreateManyArgs;
  CommandStatistics: Prisma.CommandStatisticsCreateManyArgs;
  AuditLog: Prisma.AuditLogCreateManyArgs;
};

export type ModelCreateManyAndReturnArgs = {
  User: Prisma.UserCreateManyAndReturnArgs;
  Member: Prisma.MemberCreateManyAndReturnArgs;
  Guild: Prisma.GuildCreateManyAndReturnArgs;
  CommandCooldown: Prisma.CommandCooldownCreateManyAndReturnArgs;
  CommandStatistics: Prisma.CommandStatisticsCreateManyAndReturnArgs;
  AuditLog: Prisma.AuditLogCreateManyAndReturnArgs;
};

//
// Start Delete Args
//

export type ModelDeleteArgs = {
  User: Prisma.UserDeleteArgs;
  Member: Prisma.MemberDeleteArgs;
  Guild: Prisma.GuildDeleteArgs;
  CommandCooldown: Prisma.CommandCooldownDeleteArgs;
  CommandStatistics: Prisma.CommandStatisticsDeleteArgs;
  AuditLog: Prisma.AuditLogDeleteArgs;
};

export type ModelDeleteManyArgs = {
  User: Prisma.UserDeleteManyArgs;
  Member: Prisma.MemberDeleteManyArgs;
  Guild: Prisma.GuildDeleteManyArgs;
  CommandCooldown: Prisma.CommandCooldownDeleteManyArgs;
  CommandStatistics: Prisma.CommandStatisticsDeleteManyArgs;
  AuditLog: Prisma.AuditLogDeleteManyArgs;
};

//
// Start Find Args
//

export type ModelFindFirstArgs = {
  User: Prisma.UserFindFirstArgs;
  Member: Prisma.MemberFindFirstArgs;
  Guild: Prisma.GuildFindFirstArgs;
  CommandCooldown: Prisma.CommandCooldownFindFirstArgs;
  CommandStatistics: Prisma.CommandStatisticsFindFirstArgs;
  AuditLog: Prisma.AuditLogFindFirstArgs;
};

export type ModelFindManyArgs = {
  User: Prisma.UserFindManyArgs;
  Member: Prisma.MemberFindManyArgs;
  Guild: Prisma.GuildFindManyArgs;
  CommandCooldown: Prisma.CommandCooldownFindManyArgs;
  CommandStatistics: Prisma.CommandStatisticsFindManyArgs;
  AuditLog: Prisma.AuditLogFindManyArgs;
};

export type ModelFindUniqueArgs = {
  User: Prisma.UserFindUniqueArgs;
  Member: Prisma.MemberFindUniqueArgs;
  Guild: Prisma.GuildFindUniqueArgs;
  CommandCooldown: Prisma.CommandCooldownFindUniqueArgs;
  CommandStatistics: Prisma.CommandStatisticsFindUniqueArgs;
  AuditLog: Prisma.AuditLogFindUniqueArgs;
};

//
// Start Group Args
//

export type ModelGroupByArgs = {
  User: Prisma.UserGroupByArgs;
  Member: Prisma.MemberGroupByArgs;
  Guild: Prisma.GuildGroupByArgs;
  CommandCooldown: Prisma.CommandCooldownGroupByArgs;
  CommandStatistics: Prisma.CommandStatisticsGroupByArgs;
  AuditLog: Prisma.AuditLogGroupByArgs;
};

//
// Start Other Args
//

export type ModelAggregateArgs = {
  User: Prisma.UserAggregateArgs;
  Member: Prisma.MemberAggregateArgs;
  Guild: Prisma.GuildAggregateArgs;
  CommandCooldown: Prisma.CommandCooldownAggregateArgs;
  CommandStatistics: Prisma.CommandStatisticsAggregateArgs;
  AuditLog: Prisma.AuditLogAggregateArgs;
};

export type ModelCountArgs = {
  User: Prisma.UserCountArgs;
  Member: Prisma.MemberCountArgs;
  Guild: Prisma.GuildCountArgs;
  CommandCooldown: Prisma.CommandCooldownCountArgs;
  CommandStatistics: Prisma.CommandStatisticsCountArgs;
  AuditLog: Prisma.AuditLogCountArgs;
};

//
// Start Update Args
//

export type ModelUpdateArgs = {
  User: Prisma.UserUpdateArgs;
  Member: Prisma.MemberUpdateArgs;
  Guild: Prisma.GuildUpdateArgs;
  CommandCooldown: Prisma.CommandCooldownUpdateArgs;
  CommandStatistics: Prisma.CommandStatisticsUpdateArgs;
  AuditLog: Prisma.AuditLogUpdateArgs;
};

export type ModelUpdateManyArgs = {
  User: Prisma.UserUpdateManyArgs;
  Member: Prisma.MemberUpdateManyArgs;
  Guild: Prisma.GuildUpdateManyArgs;
  CommandCooldown: Prisma.CommandCooldownUpdateManyArgs;
  CommandStatistics: Prisma.CommandStatisticsUpdateManyArgs;
  AuditLog: Prisma.AuditLogUpdateManyArgs;
};

export type ModelUpsertArgs = {
  User: Prisma.UserUpsertArgs;
  Member: Prisma.MemberUpsertArgs;
  Guild: Prisma.GuildUpsertArgs;
  CommandCooldown: Prisma.CommandCooldownUpsertArgs;
  CommandStatistics: Prisma.CommandStatisticsUpsertArgs;
  AuditLog: Prisma.AuditLogUpsertArgs;
};

//
// Start Payload Types
//

export type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
export type PrismaModelName = Exclude<
  keyof Omit<
    typeof prismaClient,
    | '$connect'
    | '$disconnect'
    | '$executeRaw'
    | '$executeRawUnsafe'
    | '$extends'
    | '$queryRaw'
    | '$queryRawUnsafe'
    | '$transaction'
  >,
  symbol
>;

export type ModelGetPayload = {
  User: Prisma.UserGetPayload<typeof populatedUser>;
  Member: Prisma.MemberGetPayload<typeof populatedMember>;
  Guild: Prisma.GuildGetPayload<typeof populatedGuild>;
  CommandCooldown: Prisma.CommandCooldownGetPayload<
    typeof populatedCommandCooldown
  >;
  CommandStatistics: Prisma.CommandStatisticsGetPayload<
    typeof populatedCommandStatistics
  >;
  AuditLog: Prisma.AuditLogGetPayload<typeof populatedAuditLog>;
};

export type ModelFieldRefs = {
  User: Prisma.UserFieldRefs;
  Member: Prisma.MemberFieldRefs;
  Guild: Prisma.GuildFieldRefs;
  CommandCooldown: Prisma.CommandCooldownFieldRefs;
  CommandStatistics: Prisma.CommandStatisticsFieldRefs;
  AuditLog: Prisma.AuditLogFieldRefs;
};

export type ModelScalarFieldEnum = {
  User: Prisma.UserScalarFieldEnum | Prisma.UserScalarFieldEnum[];
  Member: Prisma.MemberScalarFieldEnum | Prisma.MemberScalarFieldEnum[];
  Guild: Prisma.GuildScalarFieldEnum | Prisma.GuildScalarFieldEnum[];
  CommandCooldown:
    | Prisma.CommandCooldownScalarFieldEnum
    | Prisma.CommandCooldownScalarFieldEnum[];
  CommandStatistics:
    | Prisma.CommandStatisticsScalarFieldEnum
    | Prisma.CommandStatisticsScalarFieldEnum[];
  AuditLog: Prisma.AuditLogScalarFieldEnum | Prisma.AuditLogScalarFieldEnum[];
};

export type ModelGroupByPayload = {
  User: Prisma.GetUserGroupByPayload<{ by: ModelScalarFieldEnum['User'] }>;
  Member: Prisma.GetMemberGroupByPayload<{
    by: ModelScalarFieldEnum['Member'];
  }>;
  Guild: Prisma.GetGuildGroupByPayload<{ by: ModelScalarFieldEnum['Guild'] }>;
  CommandCooldown: Prisma.GetCommandCooldownGroupByPayload<{
    by: ModelScalarFieldEnum['CommandCooldown'];
  }>;
  CommandStatistics: Prisma.GetCommandStatisticsGroupByPayload<{
    by: ModelScalarFieldEnum['CommandStatistics'];
  }>;
  AuditLog: Prisma.GetAuditLogGroupByPayload<{
    by: ModelScalarFieldEnum['AuditLog'];
  }>;
};

export type ModelAggregateResult = {
  User: Prisma.AggregateUser;
  Member: Prisma.AggregateMember;
  Guild: Prisma.AggregateGuild;
  CommandCooldown: Prisma.AggregateCommandCooldown;
  CommandStatistics: Prisma.AggregateCommandStatistics;
  AuditLog: Prisma.AggregateAuditLog;
};
