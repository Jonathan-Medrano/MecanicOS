-- CreateTable
CREATE TABLE "workshop_employees" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_sessions" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "step" TEXT NOT NULL DEFAULT 'IDLE',
    "context" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workshop_employees_clerkUserId_key" ON "workshop_employees"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_employees_workshopId_email_key" ON "workshop_employees"("workshopId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "bot_sessions_workshopId_phone_key" ON "bot_sessions"("workshopId", "phone");

-- AddForeignKey
ALTER TABLE "workshop_employees" ADD CONSTRAINT "workshop_employees_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_sessions" ADD CONSTRAINT "bot_sessions_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
