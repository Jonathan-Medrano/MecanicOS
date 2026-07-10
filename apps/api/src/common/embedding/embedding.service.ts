import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>("GEMINI_API_KEY");
    if (key) this.client = new GoogleGenerativeAI(key);
  }

  async embed(text: string): Promise<number[] | null> {
    if (!this.client) return null;
    try {
      const model = this.client.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (e: any) {
      this.logger.warn(`Embedding failed: ${e.message}`);
      return null;
    }
  }
}
