import { JsonLdScript } from "@src/app/_components";
import { SOFTWARE_APPLICATION_ID } from "@src/app/_components/JsonLD";

import { CHROME_STORE_STATS } from "../_constants";

/**
 * introduce 전용 별점 마크업.
 *
 * @description
 * 레이아웃의 SoftwareApplication 과 같은 @id 를 써서 같은 엔티티에 병합된다.
 * 별점 배지가 실제로 보이는 페이지에서만 렌더해야 하므로 레이아웃이 아니라 여기 있다.
 * 값은 Hero 배지와 동일하게 CHROME_STORE_STATS 에서 온다.
 */
export default function RatingJsonLD() {
	const ratingSchema = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"@id": SOFTWARE_APPLICATION_ID,
		aggregateRating: {
			"@type": "AggregateRating",
			ratingValue: String(CHROME_STORE_STATS.rating),
			ratingCount: String(CHROME_STORE_STATS.reviewCount),
			bestRating: "5",
			worstRating: "1",
		},
	};

	return (
		<JsonLdScript
			id="software-application-rating-jsonld"
			schema={ratingSchema}
		/>
	);
}
