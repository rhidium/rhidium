-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "adminRoleId" TEXT,
    "adminLogChannelId" TEXT,
    "modRoleId" TEXT,
    "modLogChannelId" TEXT,
    "autoRoleIds" TEXT[],
    "memberJoinChannelId" TEXT,
    "memberJoinEmbedId" INTEGER,
    "memberLeaveChannelId" TEXT,
    "memberLeaveEmbedId" INTEGER,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "Embed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbedField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "inline" BOOLEAN NOT NULL,
    "embedId" INTEGER,

    CONSTRAINT "EmbedField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandStatistics" (
    "id" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "commandId" TEXT NOT NULL,
    "usages" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "lastUsedAt" TIMESTAMP(3),
    "firstUsedAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "runtimeTotal" DOUBLE PRECISION,
    "runtimeMax" DOUBLE PRECISION,
    "runtimeMin" DOUBLE PRECISION,
    "runtimeMean" DOUBLE PRECISION,
    "runtimeMedian" DOUBLE PRECISION,
    "runtimeVariance" DOUBLE PRECISION,
    "runtimeStdDeviation" DOUBLE PRECISION,

    CONSTRAINT "CommandStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Member_id_key" ON "Member"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_id_key" ON "Guild"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_guildId_key" ON "Guild"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "CommandCooldown_cooldownId_key" ON "CommandCooldown"("cooldownId");

-- CreateIndex
CREATE UNIQUE INDEX "EmbedField_id_key" ON "EmbedField"("id");

-- CreateIndex
CREATE UNIQUE INDEX "CommandStatistics_id_key" ON "CommandStatistics"("id");

-- CreateIndex
CREATE UNIQUE INDEX "CommandStatistics_commandId_key" ON "CommandStatistics"("commandId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_memberJoinEmbedId_fkey" FOREIGN KEY ("memberJoinEmbedId") REFERENCES "Embed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_memberLeaveEmbedId_fkey" FOREIGN KEY ("memberLeaveEmbedId") REFERENCES "Embed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbedField" ADD CONSTRAINT "EmbedField_embedId_fkey" FOREIGN KEY ("embedId") REFERENCES "Embed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
