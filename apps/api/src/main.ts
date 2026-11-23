import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const DEFAULT_PORT = 4000;

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// 배포 때 컨테이너가 SIGTERM을 받으면 바로 죽지 않고 진행 중인 요청을 끝낸 뒤 종료합니다.
	// blue-green 전환(infra/oracle)에서 요청이 끊기지 않게 하는 장치입니다.
	app.enableShutdownHooks();

	// 환경 변수는 언제나 문자열이라 get<number>로 받아도 실제 값은 "4000" 같은 문자열입니다. 숫자로 바꿔 씁니다.
	const port = Number(app.get(ConfigService).get("PORT") ?? DEFAULT_PORT);

	await app.listen(port);
}

bootstrap();
