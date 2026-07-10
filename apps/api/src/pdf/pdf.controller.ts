import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import { PdfService } from "./pdf.service";
import { Permissions } from "../common/decorators/permissions.decorator";
import { Permission } from "../common/permissions";

@Controller("pdf")
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Permissions(Permission.VIEW_ORDERS)
  @Get("work-orders/:id")
  async workOrderPdf(
    @Req() req: any,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generateWorkOrderPdf(req.auth.workshopId, id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orden-${id.slice(0, 8)}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }

  @Permissions(Permission.VIEW_ORDERS)
  @Get("work-orders/:id/budget")
  async budgetPdf(
    @Req() req: any,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generateBudgetPdf(req.auth.workshopId, id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="presupuesto-${id.slice(0, 8)}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }
}
