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

  findAll(workshopId: string, clientId?: string) {
    return this.prisma.vehicle.findMany({
      where: { workshopId, ...(clientId ? { clientId } : {}) },
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
      where: { id },
      data: dto,
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    const activeOrders = await this.prisma.workOrder.count({
      where: { vehicleId: id, status: { notIn: ["DELIVERED", "CANCELLED"] } },
    });
    if (activeOrders > 0) {
      throw new ConflictException(
        `El vehículo tiene ${activeOrders} orden(es) activa(s). Cerrala(s) antes de eliminarlo.`,
      );
    }
    return this.prisma.vehicle.delete({ where: { id } });
  }
}
