-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN "assigned_to_id" TEXT;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_id_fkey"
  FOREIGN KEY ("assigned_to_id") REFERENCES "workshop_employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
