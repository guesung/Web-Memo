import dynamic from "next/dynamic";

export { default as Hero } from "./Hero";
export { default as SocialProofBar } from "./SocialProofBar";

export const InteractiveDemo = dynamic(() => import("./InteractiveDemo"), {
	ssr: true,
});

export const Features = dynamic(() => import("./Features"), {
	ssr: true,
});

export const StatsSection = dynamic(() => import("./StatsSection"), {
	ssr: true,
});

export const HowItWorks = dynamic(() => import("./HowItWorks"), {
	ssr: true,
});

export const UseCases = dynamic(() => import("./UseCases"), {
	ssr: true,
});

export const Testimonials = dynamic(() => import("./Testimonials"), {
	ssr: true,
});

export const QuestionAndAnswer = dynamic(() => import("./QuestionAndAnswer"), {
	ssr: true,
});

export const FinalCTA = dynamic(() => import("./FinalCTA"), {
	ssr: true,
});

export const Footer = dynamic(() => import("./Footer"), {
	ssr: true,
});
