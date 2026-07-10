-- CreateEnum
CREATE TYPE "StepToolType" AS ENUM ('TOOL', 'PART', 'FLUID');

-- CreateTable
CREATE TABLE "processes" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "estimatedMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_steps" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER,

    CONSTRAINT "process_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_tools" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StepToolType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "step_tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processes_workshopId_idx" ON "processes"("workshopId");

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_tools" ADD CONSTRAINT "step_tools_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "process_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
