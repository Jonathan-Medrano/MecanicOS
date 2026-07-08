import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GuidesService } from "../guides/guides.service";
import { AskAssistantDto } from "@mecanico/shared";

@Injectable()
export class AssistantService {
  private readonly genai: GoogleGenerativeAI | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly guides: GuidesService,
  ) {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (apiKey) this.genai = new GoogleGenerativeAI(apiKey);
  }

  async ask(workshopId: string, dto: AskAssistantDto) {
    if (!this.genai) {
      throw new ServiceUnavailableException("AI assistant is not configured");
    }
    const keywords = this.extractKeywords(dto.question, dto.vehicle);
    const relevantGuides = await this.guides.findRelevant(workshopId, keywords);

    const guideContext =
      relevantGuides.length > 0
        ? relevantGuides
            .map((g) => `### ${g.title}${g.vehicle ? ` (${g.vehicle})` : ""}\n${g.content}`)
            .join("\n\n---\n\n")
        : null;

    const systemPrompt = `Sos un asistente técnico especializado en mecánica automotriz.
Tu rol es ayudar a mecánicos con procedimientos de reparación paso a paso.
Respondé siempre en español, de forma clara y concisa.
Usá numeración para los pasos.
Si mencionás herramientas o repuestos, especificá cuáles.
Sé técnico pero accesible.`;

    const userPrompt = guideContext
      ? `Tenés las siguientes guías técnicas de referencia:\n\n${guideContext}\n\n---\n\n${dto.vehicle ? `Vehículo: ${dto.vehicle}\n` : ""}Pregunta del mecánico: ${dto.question}`
      : `${dto.vehicle ? `Vehículo: ${dto.vehicle}\n` : ""}Pregunta del mecánico: ${dto.question}\n\n(No hay guías cargadas para este vehículo. Respondé con conocimiento general de mecánica automotriz.)`;

    try {
      const model = this.genai.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(userPrompt);
      const answer = result.response.text();

      return {
        answer,
        usedGuides: relevantGuides.map((g) => ({ id: g.id, title: g.title, vehicle: g.vehicle })),
      };
    } catch (err: any) {
      throw new ServiceUnavailableException(
        err?.message ?? "Error al conectar con el asistente de IA",
      );
    }
  }

  private extractKeywords(question: string, vehicle?: string): string[] {
    const stopWords = new Set([
      "como", "cómo", "que", "qué", "el", "la", "los", "las", "un", "una",
      "de", "del", "en", "con", "por", "para", "se", "es", "son", "hay",
      "hacer", "hago", "tengo", "puedo", "debo", "cambiar", "revisar",
    ]);
    const words = question
      .toLowerCase()
      .replace(/[¿?¡!.,;:]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const vehicleWords = vehicle
      ? vehicle.toLowerCase().split(/\s+/).filter((w) => w.length > 1)
      : [];

    return [...new Set([...vehicleWords, ...words])].slice(0, 8);
  }
}
