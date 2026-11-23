import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import type { Env } from "./config/env.validation.js";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// 배포 때 컨테이너가 SIGTERM을 받으면 바로 죽지 않고 진행 중인 요청을 끝낸 뒤 종료합니다.
	// blue-green 전환(infra/oracle)에서 요청이 끊기지 않게 하는 장치입니다.
	app.enableShutdownHooks();

	// PORT는 시작할 때 validateEnv가 숫자로 바꾸고 범위를 검사한 값이다
	const port = app.get(ConfigService<Env, true>).get("PORT", { infer: true });

	await app.listen(port);
}

bootstrap();
