/** 공개 페이지 메타데이터 생성기를 제공합니다. */

/** 유입 UTM을 읽고 저장하고 웹스토어 링크에 붙입니다. */
export {
	appendCampaignUtm,
	type CampaignUtm,
	loadCampaignUtm,
	readCampaignUtm,
	resolveCampaignUtm,
	saveCampaignUtm,
} from "./campaignUtm";
export { createPublicPageMetadata } from "./createPublicPageMetadata";
