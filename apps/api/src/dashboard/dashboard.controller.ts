import { Controller, Get, Req } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.auth.workshopId);
  }
}
