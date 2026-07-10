import { Controller, Get, Req } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";
import type { AuthRequest } from "../common/types/auth.types";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  getOverview(@Req() req: AuthRequest) {
    return this.dashboardService.getOverview(req.auth.workshopId);
  }

  @Get("revenue-chart")
  getRevenueChart(@Req() req: AuthRequest) {
    return this.dashboardService.getRevenueChart(req.auth.workshopId);
  }

  @Get("dormant-clients")
  getDormantClients(@Req() req: AuthRequest) {
    return this.dashboardService.getDormantClients(req.auth.workshopId);
  }

  @Permissions(Permission.VIEW_ORDERS)
  @Get("reports/by-mechanic")
  getRevenueByMechanic(@Req() req: AuthRequest) {
    return this.dashboardService.getRevenueByMechanic(req.auth.workshopId);
  }

  @Permissions(Permission.VIEW_ORDERS)
  @Get("reports/avg-time")
  getAvgRepairTime(@Req() req: AuthRequest) {
    return this.dashboardService.getAvgRepairTime(req.auth.workshopId);
  }

  @Permissions(Permission.VIEW_ORDERS)
  @Get("reports/top-services")
  getTopServices(@Req() req: AuthRequest) {
    return this.dashboardService.getTopServices(req.auth.workshopId);
  }
}
