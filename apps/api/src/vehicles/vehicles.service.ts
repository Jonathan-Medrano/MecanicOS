import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVehicleDto, UpdateVehicleDto } from "@mecanico/shared";

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workshopId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { workshopId_plate: { workshopId, plate: dto.plate } },
    });
    if (existing) throw new ConflictException("Plate already registered");

    return this.prisma.vehicle.create({
      data: { ...dto, workshopId },
      include: { client: { select: { id: true, name: true, phone: true } } },
    });
  }

  findAll(workshopId: string, clientId?: string, search?: string) {
    const q = search?.trim();
    return this.prisma.vehicle.findMany({
      where: {
        workshopId,
        ...(clientId ? { clientId } : {}),
        ...(q ? {
          OR: [
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { plate: { contains: q, mode: "insensitive" } },
            { client: { name: { contains: q, mode: "insensitive" } } },
          ],
        } : {}),
      },
      orderBy: { brand: "asc" },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        _count: { select: { workOrders: true } },
      },
    });
  }

  async findOne(workshopId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, workshopId },
      include: {
        client: true,
        workOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            description: true,
            createdAt: true,
            scheduledAt: true,
            estimatedCost: true,
            finalCost: true,
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    return vehicle;
  }

  async update(workshopId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOne(workshopId, id);
    return this.prisma.vehicle.update({
      where: { id, workshopId },
      data: dto,
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    const totalOrders = await this.prisma.workOrder.count({
      where: { vehicleId: id, workshopId },
    });
    if (totalOrders > 0) {
      throw new ConflictException(
        `El vehículo tiene órdenes de trabajo registradas y no puede eliminarse para preservar el historial.`,
      );
    }
    return this.prisma.vehicle.deleteMany({ where: { id, workshopId } });
  }
}
