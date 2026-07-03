import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generateWorkOrderPdf(workshopId: string, workOrderId: string): Promise<Buffer> {
    const order = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, workshopId },
      include: { client: true, vehicle: true, workshop: true },
    });
    if (!order) throw new NotFoundException("Work order not found");

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(order.workshop.name, 50, 50)
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#666")
        .text("Orden de Trabajo / Presupuesto", 50, 78)
        .fillColor("#000");

      doc
        .fontSize(10)
        .text(`N° ${order.id.slice(0, 8).toUpperCase()}`, { align: "right" })
        .text(
          `Fecha: ${new Date(order.createdAt).toLocaleDateString("es-AR")}`,
          { align: "right" },
        );

      doc.moveDown(1).moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();

      // Client + Vehicle
      const y = doc.y + 10;
      doc.fontSize(9).fillColor("#888").text("CLIENTE", 50, y);
      doc
        .fontSize(11)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text(order.client.name, 50, y + 14)
        .font("Helvetica")
        .fontSize(10)
        .text(order.client.phone)
        .text(order.client.email ?? "");

      doc.fontSize(9).fillColor("#888").text("VEHÍCULO", 300, y);
      doc
        .fontSize(11)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text(`${order.vehicle.brand} ${order.vehicle.model}`, 300, y + 14)
        .font("Helvetica")
        .fontSize(10)
        .text(`Año: ${order.vehicle.year}`)
        .text(`Patente: ${order.vehicle.plate}`)
        .text(order.vehicle.color ? `Color: ${order.vehicle.color}` : "");

      doc.moveDown(2).moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();

      // Description
      doc
        .moveDown(0.5)
        .fontSize(9)
        .fillColor("#888")
        .text("DESCRIPCIÓN DEL TRABAJO")
        .moveDown(0.3)
        .fontSize(11)
        .fillColor("#000")
        .text(order.description, { lineGap: 4 });

      if (order.mechanicNotes) {
        doc
          .moveDown(1)
          .fontSize(9)
          .fillColor("#888")
          .text("NOTAS DEL MECÁNICO")
          .moveDown(0.3)
          .fontSize(10)
          .fillColor("#444")
          .text(order.mechanicNotes, { lineGap: 4 });
      }

      // Costs
      doc
        .moveDown(1.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#ddd")
        .stroke()
        .moveDown(0.5);

      const costY = doc.y;
      if (order.estimatedCost != null) {
        doc
          .fontSize(10)
          .fillColor("#666")
          .text("Presupuesto estimado:", 350, costY)
          .fillColor("#000")
          .font("Helvetica-Bold")
          .text(`$${Number(order.estimatedCost).toLocaleString("es-AR")}`, 490, costY);
      }
      if (order.finalCost != null) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#666")
          .text("Costo final:", 350, costY + 20)
          .fillColor("#000")
          .font("Helvetica-Bold")
          .text(`$${Number(order.finalCost).toLocaleString("es-AR")}`, 490, costY + 20);
      }

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#888")
        .text(`Estado: ${order.status}`, 50, costY);

      // Footer
      doc
        .moveDown(4)
        .fontSize(8)
        .fillColor("#aaa")
        .text("Documento generado por TallerOS", { align: "center" });

      doc.end();
    });
  }
}
