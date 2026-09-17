import type { LanguageParams } from "@src/modules/i18n";
import { PATHS } from "@web-memo/shared/constants";
import { permanentRedirect } from "next/navigation";

interface LanguageRootPageProps extends LanguageParams {}

/**
 * `/ko`, `/en` 을 각 로케일의 랜딩으로 넘긴다.
 *
 * @description
 * 이 페이지가 없을 때 두 URL은 404였는데, sitemap의 최상위 항목이자 레이아웃
 * canonical·hreflang 타깃으로 쓰이고 있었다. hreflang은 타깃이 200이 아니면 클러스터
 * 전체가 폐기되므로 404 하나가 로케일 대응 전체를 무력화한다.
 *
 * 정식 주소는 어디까지나 `/{lng}/introduce` 라서 canonical·sitemap은 그쪽을 가리키고,
 * 여기는 사람이 주소를 잘라 들어왔을 때를 받는 영구 리다이렉트로만 둔다.
 */
export default function LanguageRootPage({
	params: { lng },
}: LanguageRootPageProps) {
	permanentRedirect(`/${lng}${PATHS.introduce}`);
}
