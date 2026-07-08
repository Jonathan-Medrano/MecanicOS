-- AlterTable
ALTER TABLE "workshops" ADD COLUMN     "botAutoReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "botAutoReplyMsg" TEXT;
