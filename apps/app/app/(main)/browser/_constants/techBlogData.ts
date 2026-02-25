export const BLOG_LOGO_BASE_URL = "https://tech-mail.shop/blogs/";

export interface TechBlog {
	name: string;
	url: string;
	logo: string;
}

export const BLOG_AGGREGATORS: TechBlog[] = [
	{
		name: "velog",
		url: "https://velog.io/",
		logo: "https://velog.io/favicon.ico",
	},
	{
		name: "techblogposts",
		url: "https://www.techblogposts.com/ko",
		logo: "https://techblogposts.com/opengraph-image?9c30c9807a9a820e",
	},
	{
		name: "velopers",
		url: "https://www.velopers.kr/",
		logo: "https://www.velopers.kr/favicon.png?v=2",
	},
	{
		name: "GeekNews",
		url: "https://news.hada.io/",
		logo: "https://news.hada.io/logo.png",
	},
	// { name: "네이버 블로그", url: "https://section.blog.naver.com/BlogHome.naver?directoryNo=0&currentPage=1&groupId=0", logo: "https://blog.naver.com/favicon.ico" },
	{
		name: "티스토리",
		url: "https://www.tistory.com/",
		logo: "https://www.tistory.com/favicon.ico",
	},
	{
		name: "Medium",
		url: "https://medium.com/",
		logo: "https://img1.daumcdn.net/thumb/R1280x0.fjpg/?fname=http://t1.daumcdn.net/brunch/service/user/19O6/image/27hzlDVEjfKSg5OMn6oR7S1-ksY.jpg",
	},
	// { name: "dev.to", url: "https://dev.to/", logo: "https://dev.to/favicon.ico" },
	{
		name: "요즘IT",
		url: "https://yozm.wishket.com/magazine/",
		logo: "https://yozm.wishket.com/favicon.ico",
	},
	{
		name: "Brunch",
		url: "https://brunch.co.kr/",
		logo: "https://brunch.co.kr/favicon.ico",
	},
];

export const TECH_BLOGS: TechBlog[] = [
	{ name: "토스", url: "https://toss.tech/", logo: "toss.ico" },
	{ name: "네이버 D2", url: "https://d2.naver.com/", logo: "naver.png" },
	{ name: "카카오", url: "https://tech.kakao.com/blog", logo: "kakao.png" },
	{
		name: "우아한형제들",
		url: "https://techblog.woowahan.com/",
		logo: "woowahan.png",
	},
	{ name: "당근마켓", url: "https://medium.com/daangn", logo: "daangn.ico" },
	{ name: "라인", url: "https://engineering.linecorp.com/", logo: "line.ico" },
	{
		name: "카카오페이",
		url: "https://tech.kakaopay.com/",
		logo: "kakaopay.png",
	},
	{ name: "인프랩", url: "https://tech.inflab.com/", logo: "inflab.png" },
	{ name: "마켓컬리", url: "https://helloworld.kurly.com/", logo: "kurly.png" },
	{
		name: "뱅크샐러드",
		url: "https://blog.banksalad.com/",
		logo: "banksalad.ico",
	},
	{
		name: "올리브영",
		url: "https://oliveyoung.tech/blog/",
		logo: "oliveyoung.png",
	},
	{
		name: "무신사",
		url: "https://medium.com/musinsa-tech",
		logo: "musinsa.ico",
	},
	{ name: "29cm", url: "https://medium.com/29cm", logo: "29cm.png" },
	{
		name: "여기어때",
		url: "https://techblog.gccompany.co.kr/",
		logo: "goodchoice.png",
	},
	{
		name: "요기요",
		url: "https://techblog.yogiyo.co.kr/",
		logo: "https://www.yogiyo.co.kr/media/static/img/for_facebook_180x180.jpg",
	},
	{ name: "NHN", url: "https://meetup.nhncloud.com/", logo: "nhn.jpeg" },
	{
		name: "데브시스터즈",
		url: "https://tech.devsisters.com/",
		logo: "devsisters.png",
	},
	{ name: "쏘카", url: "https://tech.socarcorp.kr/", logo: "socar.png" },
	{
		name: "하이퍼커넥트",
		url: "https://hyperconnect.github.io/",
		logo: "hyperconnect.png",
	},
	{ name: "11번가", url: "https://11st-tech.github.io/", logo: "11st.png" },
];

export const QUICK_ACCESS_COUNT = 15;
