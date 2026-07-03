import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto, UpdateClientDto } from "@mecanico/shared";

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workshopId: string, dto: CreateClientDto) {
    const existing = await this.prisma.client.findUnique({
      where: { workshopId_phone: { workshopId, phone: dto.phone } },
    });
    if (existing) throw new ConflictException("Phone already registered");

    return this.prisma.client.create({
      data: { ...dto, workshopId },
    });
  }

  findAll(workshopId: string) {
    return this.prisma.client.findMany({
      where: { workshopId },
      orderBy: { name: "asc" },
      include: { _count: { select: { vehicles: true, workOrders: true } } },
    });
  }

  async findOne(workshopId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, workshopId },
      include: { vehicles: true, workOrders: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async update(workshopId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(workshopId, id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.client.delete({ where: { id } });
  }
}
