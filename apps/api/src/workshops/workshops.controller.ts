import { Body, Controller, ForbiddenException, Get, Patch, Req } from "@nestjs/common";
import { WorkshopsService } from "./workshops.service";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class WorkshopsController {
  constructor(
    private readonly workshopsService: WorkshopsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("me")
  async getMe(@Req() req: any) {
    const { isOwner, permissions, workshopId } = req.auth;
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { id: true, name: true, phone: true, address: true, botAutoReply: true, botAutoReplyMsg: true },
    });
    return { isOwner, permissions, workshop };
  }

  @Patch("workshop/settings")
  async updateSettings(
    @Req() req: any,
    @Body() dto: { name?: string; phone?: string; address?: string; botAutoReply?: boolean; botAutoReplyMsg?: string },
  ) {
    const { workshopId, isOwner } = req.auth;
    if (!isOwner) throw new ForbiddenException("Only the workshop owner can update settings");
    return this.workshopsService.update(workshopId, dto);
  }
}
