import { createContext, useContext } from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";

interface BrowserScrollContextValue {
	tabBarTranslateY: SharedValue<number>;
	headerTranslateY: SharedValue<number>;
	isBrowserActive: SharedValue<number>;
}

const BrowserScrollContext = createContext<BrowserScrollContextValue | null>(
	null,
);

export function BrowserScrollProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const tabBarTranslateY = useSharedValue(0);
	const headerTranslateY = useSharedValue(0);
	const isBrowserActive = useSharedValue(0);

	return (
		<BrowserScrollContext.Provider
			value={{ tabBarTranslateY, headerTranslateY, isBrowserActive }}
		>
			{children}
		</BrowserScrollContext.Provider>
	);
}

export function useBrowserScroll() {
	const context = useContext(BrowserScrollContext);
	if (!context) {
		throw new Error(
			"useBrowserScroll must be used within BrowserScrollProvider",
		);
	}
	return context;
}
