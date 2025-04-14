import type { Prisma } from '@prisma/client';
import type { prismaClient } from './client';
import {
  populateGuild,
  populateMember,
  populateUser,
  populateAuditLog,
  populateReminder,
  populateCommand,
  populateSettings,
} from './select';

export const populateModelArgs = {
  User: populateUser,
  Member: populateMember,
  Guild: populateGuild,
  AuditLog: populateAuditLog,
  Reminder: populateReminder,
  Command: populateCommand,
  Settings: populateSettings,
};

//
// Start Create Args
//

export type ModelCreateArgs = {
  User: Prisma.UserCreateArgs;
  Member: Prisma.MemberCreateArgs;
  Guild: Prisma.GuildCreateArgs;
  AuditLog: Prisma.AuditLogCreateArgs;
  Reminder: Prisma.ReminderCreateArgs;
  Command: Prisma.CommandCreateArgs;
  Settings: Prisma.SettingsCreateArgs;
};

export type ModelCreateManyArgs = {
  User: Prisma.UserCreateManyArgs;
  Member: Prisma.MemberCreateManyArgs;
  Guild: Prisma.GuildCreateManyArgs;
  AuditLog: Prisma.AuditLogCreateManyArgs;
  Reminder: Prisma.ReminderCreateManyArgs;
  Command: Prisma.CommandCreateManyArgs;
  Settings: Prisma.SettingsCreateManyArgs;
};

export type ModelCreateManyAndReturnArgs = {
  User: Prisma.UserCreateManyAndReturnArgs;
  Member: Prisma.MemberCreateManyAndReturnArgs;
  Guild: Prisma.GuildCreateManyAndReturnArgs;
  AuditLog: Prisma.AuditLogCreateManyAndReturnArgs;
  Reminder: Prisma.ReminderCreateManyAndReturnArgs;
  Command: Prisma.CommandCreateManyAndReturnArgs;
  Settings: Prisma.SettingsCreateManyAndReturnArgs;
};

//
// Start Delete Args
//

export type ModelDeleteArgs = {
  User: Prisma.UserDeleteArgs;
  Member: Prisma.MemberDeleteArgs;
  Guild: Prisma.GuildDeleteArgs;
  AuditLog: Prisma.AuditLogDeleteArgs;
  Reminder: Prisma.ReminderDeleteArgs;
  Command: Prisma.CommandDeleteArgs;
  Settings: Prisma.SettingsDeleteArgs;
};

export type ModelDeleteManyArgs = {
  User: Prisma.UserDeleteManyArgs;
  Member: Prisma.MemberDeleteManyArgs;
  Guild: Prisma.GuildDeleteManyArgs;
  AuditLog: Prisma.AuditLogDeleteManyArgs;
  Reminder: Prisma.ReminderDeleteManyArgs;
  Command: Prisma.CommandDeleteManyArgs;
  Settings: Prisma.SettingsDeleteManyArgs;
};

//
// Start Find Args
//

export type ModelFindFirstArgs = {
  User: Prisma.UserFindFirstArgs;
  Member: Prisma.MemberFindFirstArgs;
  Guild: Prisma.GuildFindFirstArgs;
  AuditLog: Prisma.AuditLogFindFirstArgs;
  Reminder: Prisma.ReminderFindFirstArgs;
  Command: Prisma.CommandFindFirstArgs;
  Settings: Prisma.SettingsFindFirstArgs;
};

export type ModelFindManyArgs = {
  User: Prisma.UserFindManyArgs;
  Member: Prisma.MemberFindManyArgs;
  Guild: Prisma.GuildFindManyArgs;
  AuditLog: Prisma.AuditLogFindManyArgs;
  Reminder: Prisma.ReminderFindManyArgs;
  Command: Prisma.CommandFindManyArgs;
  Settings: Prisma.SettingsFindManyArgs;
};

export type ModelFindUniqueArgs = {
  User: Prisma.UserFindUniqueArgs;
  Member: Prisma.MemberFindUniqueArgs;
  Guild: Prisma.GuildFindUniqueArgs;
  AuditLog: Prisma.AuditLogFindUniqueArgs;
  Reminder: Prisma.ReminderFindUniqueArgs;
  Command: Prisma.CommandFindUniqueArgs;
  Settings: Prisma.SettingsFindUniqueArgs;
};

//
// Start Group Args
//

export type ModelGroupByArgs = {
  User: Prisma.UserGroupByArgs;
  Member: Prisma.MemberGroupByArgs;
  Guild: Prisma.GuildGroupByArgs;
  AuditLog: Prisma.AuditLogGroupByArgs;
  Reminder: Prisma.ReminderGroupByArgs;
  Command: Prisma.CommandGroupByArgs;
  Settings: Prisma.SettingsGroupByArgs;
};

//
// Start Other Args
//

export type ModelAggregateArgs = {
  User: Prisma.UserAggregateArgs;
  Member: Prisma.MemberAggregateArgs;
  Guild: Prisma.GuildAggregateArgs;
  AuditLog: Prisma.AuditLogAggregateArgs;
  Reminder: Prisma.ReminderAggregateArgs;
  Command: Prisma.CommandAggregateArgs;
  Settings: Prisma.SettingsAggregateArgs;
};

export type ModelCountArgs = {
  User: Prisma.UserCountArgs;
  Member: Prisma.MemberCountArgs;
  Guild: Prisma.GuildCountArgs;
  AuditLog: Prisma.AuditLogCountArgs;
  Reminder: Prisma.ReminderCountArgs;
  Command: Prisma.CommandCountArgs;
  Settings: Prisma.SettingsCountArgs;
};

//
// Start Update Args
//

export type ModelUpdateArgs = {
  User: Prisma.UserUpdateArgs;
  Member: Prisma.MemberUpdateArgs;
  Guild: Prisma.GuildUpdateArgs;
  AuditLog: Prisma.AuditLogUpdateArgs;
  Reminder: Prisma.ReminderUpdateArgs;
  Command: Prisma.CommandUpdateArgs;
  Settings: Prisma.SettingsUpdateArgs;
};

export type ModelUpdateManyArgs = {
  User: Prisma.UserUpdateManyArgs;
  Member: Prisma.MemberUpdateManyArgs;
  Guild: Prisma.GuildUpdateManyArgs;
  AuditLog: Prisma.AuditLogUpdateManyArgs;
  Reminder: Prisma.ReminderUpdateManyArgs;
  Command: Prisma.CommandUpdateManyArgs;
  Settings: Prisma.SettingsUpdateManyArgs;
};

export type ModelUpsertArgs = {
  User: Prisma.UserUpsertArgs;
  Member: Prisma.MemberUpsertArgs;
  Guild: Prisma.GuildUpsertArgs;
  AuditLog: Prisma.AuditLogUpsertArgs;
  Reminder: Prisma.ReminderUpsertArgs;
  Command: Prisma.CommandUpsertArgs;
  Settings: Prisma.SettingsUpsertArgs;
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
  User: Prisma.UserGetPayload<typeof populateUser>;
  Member: Prisma.MemberGetPayload<typeof populateMember>;
  Guild: Prisma.GuildGetPayload<typeof populateGuild>;
  AuditLog: Prisma.AuditLogGetPayload<typeof populateAuditLog>;
  Reminder: Prisma.ReminderGetPayload<typeof populateReminder>;
  Command: Prisma.CommandGetPayload<typeof populateCommand>;
  Settings: Prisma.SettingsGetPayload<typeof populateSettings>;
};

export type ModelFieldRefs = {
  User: Prisma.UserFieldRefs;
  Member: Prisma.MemberFieldRefs;
  Guild: Prisma.GuildFieldRefs;
  AuditLog: Prisma.AuditLogFieldRefs;
  Reminder: Prisma.ReminderFieldRefs;
  Command: Prisma.CommandFieldRefs;
  Settings: Prisma.SettingsFieldRefs;
};

export type ModelScalarFieldEnum = {
  User: Prisma.UserScalarFieldEnum | Prisma.UserScalarFieldEnum[];
  Member: Prisma.MemberScalarFieldEnum | Prisma.MemberScalarFieldEnum[];
  Guild: Prisma.GuildScalarFieldEnum | Prisma.GuildScalarFieldEnum[];
  AuditLog: Prisma.AuditLogScalarFieldEnum | Prisma.AuditLogScalarFieldEnum[];
  Reminder: Prisma.ReminderScalarFieldEnum | Prisma.ReminderScalarFieldEnum[];
  Command: Prisma.CommandScalarFieldEnum | Prisma.CommandScalarFieldEnum[];
  Settings: Prisma.SettingsScalarFieldEnum | Prisma.SettingsScalarFieldEnum[];
};

export type ModelGroupByPayload = {
  User: Prisma.GetUserGroupByPayload<{ by: ModelScalarFieldEnum['User'] }>;
  Member: Prisma.GetMemberGroupByPayload<{
    by: ModelScalarFieldEnum['Member'];
  }>;
  Guild: Prisma.GetGuildGroupByPayload<{ by: ModelScalarFieldEnum['Guild'] }>;
  AuditLog: Prisma.GetAuditLogGroupByPayload<{
    by: ModelScalarFieldEnum['AuditLog'];
  }>;
  Reminder: Prisma.GetReminderGroupByPayload<{
    by: ModelScalarFieldEnum['Reminder'];
  }>;
  Command: Prisma.GetCommandGroupByPayload<{
    by: ModelScalarFieldEnum['Command'];
  }>;
  Settings: Prisma.GetSettingsGroupByPayload<{
    by: ModelScalarFieldEnum['Settings'];
  }>;
};

export type ModelAggregateResult = {
  User: Prisma.AggregateUser;
  Member: Prisma.AggregateMember;
  Guild: Prisma.AggregateGuild;
  AuditLog: Prisma.AggregateAuditLog;
  Reminder: Prisma.AggregateReminder;
  Command: Prisma.AggregateCommand;
  Settings: Prisma.AggregateSettings;
};
