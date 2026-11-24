import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Env } from "../config/env.validation.js";
import { PrismaClient } from "../generated/prisma/client.js";

/** 풀이 동시에 여는 DB 연결 수의 상한. 한 대뿐인 서버와 Supabase 풀러의 연결 한도에 맞춘 작은 값이다 */
const POOL_MAX_CONNECTIONS = 5;
/** 풀에서 연결을 못 얻으면 요청을 붙잡아 두지 않고 이 시간 뒤에 실패시킨다 */
const POOL_CONNECTION_TIMEOUT_MS = 5000;

/**
 * DB에 붙는 Prisma 클라이언트. 서버 전체가 인스턴스 하나(=커넥션 풀 하나)를 나눠 쓴다.
 *
 * @description 서버가 뜰 때 DB에 미리 연결하지 않는다. 연결은 첫 쿼리 때 풀이 만든다.
 * DB가 잠깐 죽어 있어도 서버는 뜨고, DB를 쓰지 않는 요청(Slack 웹훅·/health)은 그대로 처리한다.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
	constructor(config: ConfigService<Env, true>) {
		super({
			adapter: new PrismaPg({
				connectionString: config.get("DATABASE_URL", { infer: true }),
				max: POOL_MAX_CONNECTIONS,
				connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
			}),
		});
	}

	// 종료(SIGTERM) 때 풀의 연결을 닫는다. 닫지 않으면 DB 쪽에 연결이 남아 한도를 갉아먹는다
	async onModuleDestroy() {
		await this.$disconnect();
	}
}
