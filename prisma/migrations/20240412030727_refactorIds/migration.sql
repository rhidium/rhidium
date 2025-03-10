/*
  Warnings:

  - The primary key for the `CommandStatistics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `CommandStatistics` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `EmbedField` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `EmbedField` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `guildId` on the `Guild` table. All the data in the column will be lost.
*/

-- DropIndex
DROP INDEX "Guild_guildId_key";

-- AlterTable
ALTER TABLE "CommandStatistics" DROP CONSTRAINT "CommandStatistics_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "CommandStatistics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "EmbedField" DROP CONSTRAINT "EmbedField_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "EmbedField_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Guild" DROP COLUMN "guildId";

-- CreateIndex
CREATE UNIQUE INDEX "CommandStatistics_id_key" ON "CommandStatistics"("id");

-- CreateIndex
CREATE UNIQUE INDEX "EmbedField_id_key" ON "EmbedField"("id");
