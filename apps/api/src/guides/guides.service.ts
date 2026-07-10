import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingService } from "../common/embedding/embedding.service";
import { CreateGuideDto, UpdateGuideDto } from "@mecanico/shared";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function guideText(title: string, vehicle?: string | null, category?: string | null, content?: string): string {
  return [title, vehicle, category, content].filter(Boolean).join("\n");
}

@Injectable()
export class GuidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  async create(workshopId: string, dto: CreateGuideDto) {
    const guide = await this.prisma.technicalGuide.create({ data: { ...dto, workshopId } });
    void this.indexGuide(guide.id, dto.title, dto.vehicle, dto.category, dto.content);
    return guide;
  }

  findAll(workshopId: string, search?: string) {
    return this.prisma.technicalGuide.findMany({
      where: {
        workshopId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { vehicle: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, vehicle: true, category: true, createdAt: true },
    });
  }

  async findOne(workshopId: string, id: string) {
    const guide = await this.prisma.technicalGuide.findFirst({ where: { id, workshopId } });
    if (!guide) throw new NotFoundException("Guide not found");
    return guide;
  }

  async update(workshopId: string, id: string, dto: UpdateGuideDto) {
    await this.findOne(workshopId, id);
    const guide = await this.prisma.technicalGuide.update({ where: { id, workshopId }, data: dto });
    void this.indexGuide(guide.id, guide.title, guide.vehicle, guide.category, guide.content);
    return guide;
  }

  async remove(workshopId: string, id: string) {
    await this.findOne(workshopId, id);
    return this.prisma.technicalGuide.deleteMany({ where: { id, workshopId } });
  }

  async findRelevant(workshopId: string, keywords: string[]) {
    if (keywords.length === 0) return [];

    const queryText = keywords.join(" ");
    const queryEmbedding = await this.embedding.embed(queryText);

    if (queryEmbedding) {
      return this.semanticSearch(workshopId, queryEmbedding);
    }

    return this.keywordSearch(workshopId, keywords);
  }

  private async semanticSearch(workshopId: string, queryEmbedding: number[]) {
    const guides = await this.prisma.$queryRaw<
      { id: string; title: string; vehicle: string | null; category: string | null; content: string; embedding: string | null }[]
    >`
      SELECT id, title, vehicle, category, content, embedding::text
      FROM technical_guides
      WHERE "workshopId" = ${workshopId}
      ORDER BY embedding <=> ${`[${queryEmbedding.join(",")}]`}::vector
      LIMIT 4
    `;

    return guides.map((g) => ({
      id: g.id,
      title: g.title,
      vehicle: g.vehicle,
      category: g.category,
      content: g.content,
    }));
  }

  private keywordSearch(workshopId: string, keywords: string[]) {
    return this.prisma.technicalGuide.findMany({
      where: {
        workshopId,
        OR: keywords.flatMap((kw) => [
          { title: { contains: kw, mode: "insensitive" } },
          { vehicle: { contains: kw, mode: "insensitive" } },
          { category: { contains: kw, mode: "insensitive" } },
          { content: { contains: kw, mode: "insensitive" } },
        ]),
      },
      take: 4,
      orderBy: { updatedAt: "desc" },
    });
  }

  private async indexGuide(
    id: string,
    title: string,
    vehicle?: string | null,
    category?: string | null,
    content?: string,
  ) {
    const vec = await this.embedding.embed(guideText(title, vehicle, category, content));
    if (!vec) return;
    await this.prisma.$executeRaw`
      UPDATE technical_guides
      SET embedding = ${`[${vec.join(",")}]`}::vector
      WHERE id = ${id}
    `;
  }
}
