-- CreateIndex
CREATE INDEX "technical_guides_workshopId_idx" ON "technical_guides"("workshopId");

-- CreateIndex
CREATE INDEX "work_orders_workshopId_idx" ON "work_orders"("workshopId");

-- CreateIndex
CREATE INDEX "work_orders_workshopId_status_idx" ON "work_orders"("workshopId", "status");

-- CreateIndex
CREATE INDEX "work_orders_workshopId_scheduledAt_idx" ON "work_orders"("workshopId", "scheduledAt");
