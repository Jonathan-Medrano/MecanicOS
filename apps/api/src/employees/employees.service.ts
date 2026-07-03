import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface CreateEmployeeDto {
  name: string;
  email: string;
  phone?: string;
  permissions: string[];
}

interface UpdateEmployeeDto {
  name?: string;
  phone?: string;
  permissions?: string[];
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workshopId: string, dto: CreateEmployeeDto) {
    const existing = await this.prisma.workshopEmployee.findFirst({
      where: { workshopId, email: dto.email },
    });
    if (existing) throw new ConflictException("Email already registered");

    return this.prisma.workshopEmployee.create({
      data: { workshopId, ...dto },
    });
  }

  findAll(workshopId: string) {
    return this.prisma.workshopEmployee.findMany({
      where: { workshopId },
      orderBy: { name: "asc" },
    });
  }

  async findOne(workshopId: string, id: string) {
    const emp = await this.prisma.workshopEmployee.findFirst({
      where: { id, workshopId },
    });
    if (!emp) throw new NotFoundException("Employee not found");
    return emp;
  }

  async update(workshopId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(workshopId, id);
    return this.prisma.workshopEmployee.update({ where: { id }, data: dto });
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.workshopEmployee.delete({ where: { id } });
  }
}
