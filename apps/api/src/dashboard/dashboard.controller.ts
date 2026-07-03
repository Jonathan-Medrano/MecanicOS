import { Controller, Get, Req } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  getOverview(@Req() req: any) {
    return this.dashboardService.getOverview(req.auth.workshopId);
  }
}
