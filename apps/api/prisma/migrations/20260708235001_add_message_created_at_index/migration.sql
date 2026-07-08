-- CreateIndex
CREATE INDEX "messages_workshopId_createdAt_idx" ON "messages"("workshopId", "createdAt" DESC);
