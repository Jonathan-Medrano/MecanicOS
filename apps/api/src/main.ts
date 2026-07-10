import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger("Bootstrap");

  app.set("trust proxy", 1);
  app.use(helmet());

  app.enableCors({
    origin: process.env.WEB_URL ?? "http://localhost:3001",
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`API listening on port ${port}`);
}
bootstrap();
