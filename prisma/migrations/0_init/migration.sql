-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('KICK', 'BAN_DURATION', 'BAN_PERMANENT', 'MUTE_DURATION', 'MUTE_PERMANENT');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "timezone" TEXT,
    "risk" "RiskLevel" NOT NULL DEFAULT 'NONE',
    "riskOriginGuildIds" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "GuildId" TEXT NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("UserId","GuildId")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "CaseCounterId" INTEGER NOT NULL,
    "adminRoleIds" TEXT[],
    "adminUserIds" TEXT[],
    "auditLogChannelId" TEXT,
    "disabledCommands" TEXT[],
    "modRoleIds" TEXT[],
    "modLogChannelId" TEXT,
    "modsCanModerateMods" BOOLEAN NOT NULL DEFAULT false,
    "autoRoleIds" TEXT[],
    "memberJoinChannelId" TEXT,
    "memberLeaveChannelId" TEXT,
    "MemberJoinEmbedId" INTEGER,
    "MemberLeaveEmbedId" INTEGER,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildCaseCounter" (
    "id" SERIAL NOT NULL,
    "caseNumber" INTEGER NOT NULL,
    "GuildId" TEXT NOT NULL,

    CONSTRAINT "GuildCaseCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeverityConfiguration" (
    "GuildId" TEXT NOT NULL,
    "LOW" INTEGER NOT NULL DEFAULT 1,
    "MEDIUM" INTEGER NOT NULL DEFAULT 2,
    "HIGH" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "SeverityConfiguration_pkey" PRIMARY KEY ("GuildId")
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" SERIAL NOT NULL,
    "caseNumber" INTEGER NOT NULL,
    "severity" "Severity" NOT NULL,
    "message" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "MemberUserId" TEXT NOT NULL,
    "MemberGuildId" TEXT NOT NULL,
    "IssuedByUserId" TEXT NOT NULL,
    "IssuedByGuildId" TEXT NOT NULL,
    "RemovedByUserId" TEXT,
    "RemovedByGuildId" TEXT,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoModerationAction" (
    "id" SERIAL NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "triggerThreshold" INTEGER NOT NULL,
    "actionDurationMs" INTEGER,
    "deleteMessageSeconds" INTEGER,
    "oncePerMember" BOOLEAN NOT NULL,
    "GuildId" TEXT NOT NULL,

    CONSTRAINT "AutoModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "UserId" TEXT NOT NULL,
    "GuildId" TEXT,
    "message" TEXT NOT NULL,
    "channelId" TEXT,
    "shouldDM" BOOLEAN NOT NULL DEFAULT false,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "repeatEvery" INTEGER,
    "repeatUntil" TIMESTAMP(3),

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "UserId" TEXT NOT NULL,
    "GuildId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandCooldown" (
    "id" SERIAL NOT NULL,
    "cooldownId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "usages" TIMESTAMP(3)[],

    CONSTRAINT "CommandCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandStatistics" (
    "id" SERIAL NOT NULL,
    "type" INTEGER NOT NULL,
    "commandId" TEXT NOT NULL,
    "usages" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "lastUsedAt" TIMESTAMP(3),
    "firstUsedAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "runtimeCount" INTEGER NOT NULL,
    "runtimeTotal" DOUBLE PRECISION,
    "runtimeMax" DOUBLE PRECISION,
    "runtimeMin" DOUBLE PRECISION,
    "runtimeMean" DOUBLE PRECISION,
    "runtimeMedian" DOUBLE PRECISION,
    "runtimeVariance" DOUBLE PRECISION,
    "runtimeStdDeviation" DOUBLE PRECISION,

    CONSTRAINT "CommandStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Embed" (
    "id" SERIAL NOT NULL,
    "messageText" TEXT,
    "color" INTEGER,
    "authorName" TEXT,
    "authorIconURL" TEXT,
    "authorURL" TEXT,
    "title" TEXT,
    "description" TEXT,
    "url" TEXT,
    "imageURL" TEXT,
    "thumbnailURL" TEXT,
    "footerText" TEXT,
    "footerIconURL" TEXT,
    "GuildId" TEXT NOT NULL,

    CONSTRAINT "Embed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbedField" (
    "id" SERIAL NOT NULL,
    "EmbedId" INTEGER,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "inline" BOOLEAN NOT NULL,

    CONSTRAINT "EmbedField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AutoModerationActionToWarning" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AutoModerationActionToWarning_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Member_id_key" ON "Member"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_id_key" ON "Guild"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_CaseCounterId_key" ON "Guild"("CaseCounterId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildCaseCounter_GuildId_key" ON "GuildCaseCounter"("GuildId");

-- CreateIndex
CREATE INDEX "GuildInd" ON "GuildCaseCounter"("GuildId");

-- CreateIndex
CREATE UNIQUE INDEX "SeverityConfiguration_GuildId_key" ON "SeverityConfiguration"("GuildId");

-- CreateIndex
CREATE INDEX "MemberInd" ON "Warning"("MemberUserId", "MemberGuildId");

-- CreateIndex
CREATE INDEX "IssuedByInd" ON "Warning"("IssuedByUserId", "IssuedByGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "Warning_MemberGuildId_caseNumber_key" ON "Warning"("MemberGuildId", "caseNumber");

-- CreateIndex
CREATE INDEX "AutoModerationAction_GuildId_idx" ON "AutoModerationAction"("GuildId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoModerationAction_GuildId_action_triggerThreshold_key" ON "AutoModerationAction"("GuildId", "action", "triggerThreshold");

-- CreateIndex
CREATE UNIQUE INDEX "CommandCooldown_cooldownId_key" ON "CommandCooldown"("cooldownId");

-- CreateIndex
CREATE UNIQUE INDEX "CommandStatistics_id_key" ON "CommandStatistics"("id");

-- CreateIndex
CREATE UNIQUE INDEX "CommandStatistics_commandId_key" ON "CommandStatistics"("commandId");

-- CreateIndex
CREATE UNIQUE INDEX "EmbedField_id_key" ON "EmbedField"("id");

-- CreateIndex
CREATE INDEX "_AutoModerationActionToWarning_B_index" ON "_AutoModerationActionToWarning"("B");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_GuildId_fkey" FOREIGN KEY ("GuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_CaseCounterId_fkey" FOREIGN KEY ("CaseCounterId") REFERENCES "GuildCaseCounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_MemberJoinEmbedId_fkey" FOREIGN KEY ("MemberJoinEmbedId") REFERENCES "Embed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_MemberLeaveEmbedId_fkey" FOREIGN KEY ("MemberLeaveEmbedId") REFERENCES "Embed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeverityConfiguration" ADD CONSTRAINT "SeverityConfiguration_GuildId_fkey" FOREIGN KEY ("GuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_MemberUserId_MemberGuildId_fkey" FOREIGN KEY ("MemberUserId", "MemberGuildId") REFERENCES "Member"("UserId", "GuildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_IssuedByUserId_IssuedByGuildId_fkey" FOREIGN KEY ("IssuedByUserId", "IssuedByGuildId") REFERENCES "Member"("UserId", "GuildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_RemovedByUserId_RemovedByGuildId_fkey" FOREIGN KEY ("RemovedByUserId", "RemovedByGuildId") REFERENCES "Member"("UserId", "GuildId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoModerationAction" ADD CONSTRAINT "AutoModerationAction_GuildId_fkey" FOREIGN KEY ("GuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_GuildId_fkey" FOREIGN KEY ("GuildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbedField" ADD CONSTRAINT "EmbedField_EmbedId_fkey" FOREIGN KEY ("EmbedId") REFERENCES "Embed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AutoModerationActionToWarning" ADD CONSTRAINT "_AutoModerationActionToWarning_A_fkey" FOREIGN KEY ("A") REFERENCES "AutoModerationAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AutoModerationActionToWarning" ADD CONSTRAINT "_AutoModerationActionToWarning_B_fkey" FOREIGN KEY ("B") REFERENCES "Warning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

