export const LANGUAGE_MAP: Record<string, string> = {
	ar: "Arabic",
	am: "Amharic",
	bg: "Bulgarian",
	bn: "Bengali",
	ca: "Catalan",
	cs: "Czech",
	da: "Danish",
	de: "German",
	el: "Greek",
	en: "English",
	"en-AU": "English (Australia)",
	"en-GB": "English (Great Britain)",
	"en-US": "English (USA)",
	es: "Spanish",
	"es-419": "Spanish (Latin America and Caribbean)",
	et: "Estonian",
	fa: "Persian",
	fi: "Finnish",
	fil: "Filipino",
	fr: "French",
	gu: "Gujarati",
	he: "Hebrew",
	hi: "Hindi",
	hr: "Croatian",
	hu: "Hungarian",
	id: "Indonesian",
	it: "Italian",
	ja: "Japanese",
	kn: "Kannada",
	ko: "Korean",
	lt: "Lithuanian",
	lv: "Latvian",
	ml: "Malayalam",
	mr: "Marathi",
	ms: "Malay",
	nl: "Dutch",
	no: "Norwegian",
	pl: "Polish",
	"pt-BR": "Portuguese (Brazil)",
	"pt-PT": "Portuguese (Portugal)",
	ro: "Romanian",
	ru: "Russian",
	sk: "Slovak",
	sl: "Slovenian",
	sr: "Serbian",
	sv: "Swedish",
	sw: "Swahili",
	ta: "Tamil",
	te: "Telugu",
	th: "Thai",
	tr: "Turkish",
	uk: "Ukrainian",
	vi: "Vietnamese",
	"zh-CN": "Chinese (China)",
	"zh-TW": "Chinese (Taiwan)",
};

interface Language {
	inEnglish: (typeof LANGUAGE_MAP)[keyof typeof LANGUAGE_MAP];
	inNative: string;
}

export const LANGUAGE_LIST: Language[] = [
	{
		inEnglish: "Arabic",
		inNative: "العربية",
	},
	{
		inEnglish: "Amharic",
		inNative: "አማርኛ",
	},
	{
		inEnglish: "Bulgarian",
		inNative: "Български",
	},
	{
		inEnglish: "Bengali",
		inNative: "বাংলা",
	},
	{
		inEnglish: "Catalan",
		inNative: "Català",
	},
	{
		inEnglish: "Czech",
		inNative: "Čeština",
	},
	{
		inEnglish: "Danish",
		inNative: "Dansk",
	},
	{
		inEnglish: "German",
		inNative: "Deutsch",
	},
	{
		inEnglish: "Greek",
		inNative: "Ελληνικά",
	},
	{
		inEnglish: "English",
		inNative: "English",
	},
	{
		inEnglish: "English (Australia)",
		inNative: "English (Australia)",
	},
	{
		inEnglish: "English (Great Britain)",
		inNative: "English (Great Britain)",
	},
	{
		inEnglish: "English (USA)",
		inNative: "English (USA)",
	},
	{
		inEnglish: "Spanish",
		inNative: "Español",
	},
	{
		inEnglish: "Spanish (Latin America and Caribbean)",
		inNative: "Español (Latinoamérica)",
	},
	{
		inEnglish: "Estonian",
		inNative: "Eesti",
	},
	{
		inEnglish: "Persian",
		inNative: "فارسی",
	},
	{
		inEnglish: "Finnish",
		inNative: "Suomi",
	},
	{
		inEnglish: "Filipino",
		inNative: "Filipino",
	},
	{
		inEnglish: "French",
		inNative: "Français",
	},
	{
		inEnglish: "Gujarati",
		inNative: "ગુજરાતી",
	},
	{
		inEnglish: "Hebrew",
		inNative: "עברית",
	},
	{
		inEnglish: "Hindi",
		inNative: "हिन्दी",
	},
	{
		inEnglish: "Croatian",
		inNative: "Hrvatski",
	},
	{
		inEnglish: "Hungarian",
		inNative: "Magyar",
	},
	{
		inEnglish: "Indonesian",
		inNative: "Bahasa Indonesia",
	},
	{
		inEnglish: "Italian",
		inNative: "Italiano",
	},
	{
		inEnglish: "Japanese",
		inNative: "日本語",
	},
	{
		inEnglish: "Kannada",
		inNative: "ಕನ್ನಡ",
	},
	{
		inEnglish: "Korean",
		inNative: "한국어",
	},
	{
		inEnglish: "Lithuanian",
		inNative: "Lietuvių",
	},
	{
		inEnglish: "Latvian",
		inNative: "Latviešu",
	},
	{
		inEnglish: "Malayalam",
		inNative: "മലയാളം",
	},
	{
		inEnglish: "Marathi",
		inNative: "मराठी",
	},
	{
		inEnglish: "Malay",
		inNative: "Bahasa Melayu",
	},
	{
		inEnglish: "Dutch",
		inNative: "Nederlands",
	},
	{
		inEnglish: "Norwegian",
		inNative: "Norsk",
	},
	{
		inEnglish: "Polish",
		inNative: "Polski",
	},
	{
		inEnglish: "Portuguese (Brazil)",
		inNative: "Português (Brasil)",
	},
	{
		inEnglish: "Portuguese (Portugal)",
		inNative: "Português",
	},
	{
		inEnglish: "Romanian",
		inNative: "Română",
	},
	{
		inEnglish: "Russian",
		inNative: "Русский",
	},
	{
		inEnglish: "Slovak",
		inNative: "Slovenčina",
	},
	{
		inEnglish: "Slovenian",
		inNative: "Slovenščina",
	},
	{
		inEnglish: "Serbian",
		inNative: "Српски",
	},
	{
		inEnglish: "Swedish",
		inNative: "Svenska",
	},
	{
		inEnglish: "Swahili",
		inNative: "Kiswahili",
	},
	{
		inEnglish: "Tamil",
		inNative: "தமிழ்",
	},
	{
		inEnglish: "Telugu",
		inNative: "తెలుగు",
	},
	{
		inEnglish: "Thai",
		inNative: "ไทย",
	},
	{
		inEnglish: "Turkish",
		inNative: "Türkçe",
	},
	{
		inEnglish: "Ukrainian",
		inNative: "Українська",
	},
	{
		inEnglish: "Vietnamese",
		inNative: "Tiếng Việt",
	},
	{
		inEnglish: "Chinese (China)",
		inNative: "中文 (中国)",
	},
	{
		inEnglish: "Chinese (Taiwan)",
		inNative: "中文 (台灣)",
	},
];
