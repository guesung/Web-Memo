interface JsonLdScriptProps {
	id: string;
	schema: Record<string, unknown>;
}

/**
 * JSON-LD 스키마를 SSR HTML에 직접 삽입한다.
 *
 * @description
 * next/script는 afterInteractive라 스키마가 초기 HTML이 아니라 RSC flight payload
 * (`self.__next_f.push`) 안에만 실린다. Googlebot은 렌더링하니 결국 보지만 Bing·AI
 * 크롤러·소셜 스크래퍼처럼 JS를 돌리지 않는 소비자는 스키마를 통째로 놓친다.
 * 서버 컴포넌트에서 평범한 <script>를 쓰면 그대로 직렬화돼 초기 HTML에 남는다.
 *
 * JSON-LD에 next/script를 쓰지 말라는 건 Next 공식 권고이기도 하다.
 */
export default function JsonLdScript({ id, schema }: JsonLdScriptProps) {
	return (
		<script
			id={id}
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 주입에 필요
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}
