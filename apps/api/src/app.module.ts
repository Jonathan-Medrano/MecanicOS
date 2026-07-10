import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { WorkshopsModule } from "./workshops/workshops.module";
import { ClientsModule } from "./clients/clients.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { WorkOrdersModule } from "./work-orders/work-orders.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";
import { PdfModule } from "./pdf/pdf.module";
import { EmployeesModule } from "./employees/employees.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { GuidesModule } from "./guides/guides.module";
import { AssistantModule } from "./assistant/assistant.module";
import { HealthModule } from "./health/health.module";
import { TrackModule } from "./track/track.module";
import { PartsModule } from "./parts/parts.module";
import { RemindersModule } from "./reminders/reminders.module";
import { ClerkAuthGuard } from "./common/guards/clerk-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WorkshopsModule,
    ClientsModule,
    VehiclesModule,
    WorkOrdersModule,
    DashboardModule,
    WhatsAppModule,
    PdfModule,
    EmployeesModule,
    NotificationsModule,
    GuidesModule,
    AssistantModule,
    HealthModule,
    TrackModule,
    PartsModule,
    RemindersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
