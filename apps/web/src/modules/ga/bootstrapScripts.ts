import {
	ANALYTICS,
	ANALYTICS_EXCLUDED_STORAGE_KEY,
} from "@web-memo/shared/constants";

export const disableExcludedScript = `try{if(localStorage.getItem("${ANALYTICS_EXCLUDED_STORAGE_KEY}")==="1"){window["ga-disable-${ANALYTICS.gaId}"]=true}}catch(e){}`;

export const adoptExtensionClientIdScript = `try{var m=location.search.match(/[?&]ext_cid=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(&|$)/i);if(m&&document.cookie.indexOf("_ga=GA1.1."+m[1])===-1){document.cookie="_ga=GA1.1."+m[1]+"; path=/; max-age=34560000; SameSite=Lax; domain=.webmemo.xyz"}}catch(e){}`;

export const queueAnalyticsScript = `window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config','${ANALYTICS.gaId}',{page_location:location.href,page_title:document.title});window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});`;
