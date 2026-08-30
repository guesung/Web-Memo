import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

import { cn } from "../utils";

/** 활성 탭 인디케이터가 자기 자리를 찾는 데 필요한 값 */
interface IFTabsIndicatorContext {
	/** 현재 선택된 탭의 value */
	activeValue: string | undefined;
	/** 같은 Tabs 안의 인디케이터끼리 이어지도록 묶는 식별자 */
	layoutId: string;
}

// 활성 탭 배경이 탭 사이를 건너가는 물리값. 살짝 무겁게 잡아 스냅이 아니라
// 활공으로 읽히게 한다. 출처: https://beui.dev (MIT License) — lib/ease.ts
const INDICATOR_SPRING = {
	type: "spring",
	stiffness: 360,
	damping: 32,
	mass: 0.6,
} as const;

const TabsIndicatorContext =
	React.createContext<IFTabsIndicatorContext | null>(null);

/**
 * Radix Tabs 위에 활성 탭 인디케이터를 얹은 탭.
 *
 * @description
 * 키보드 이동·aria 는 Radix 가 그대로 담당하고, 이 래퍼는 인디케이터가
 * 어느 트리거에 붙어야 하는지 알기 위해 선택값만 들고 있는다. controlled·
 * uncontrolled 둘 다 원래대로 쓸 수 있다.
 */
const Tabs = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
	const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
	const layoutId = React.useId();

	const isControlled = value !== undefined;
	const activeValue = isControlled ? value : uncontrolledValue;

	const handleValueChange = (nextValue: string) => {
		if (!isControlled) {
			setUncontrolledValue(nextValue);
		}
		onValueChange?.(nextValue);
	};

	// uncontrolled 일 때 value 를 넘기면 첫 클릭 전까지 undefined 라, Radix 가
	// uncontrolled 로 시작했다가 값이 생기는 순간 controlled 로 넘어간다.
	// 넘기는 prop 자체를 갈라 Radix 쪽 모드가 중간에 바뀌지 않게 한다.
	const rootValueProps = isControlled ? { value } : { defaultValue };

	return (
		<TabsIndicatorContext.Provider value={{ activeValue, layoutId }}>
			<TabsPrimitive.Root
				ref={ref}
				{...rootValueProps}
				onValueChange={handleValueChange}
				{...props}
			/>
		</TabsIndicatorContext.Provider>
	);
});
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.List
		ref={ref}
		className={cn(
			"bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg p-1",
			className,
		)}
		{...props}
	/>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
	const indicatorContext = React.useContext(TabsIndicatorContext);
	const prefersReducedMotion = useReducedMotion();

	const isActive = indicatorContext?.activeValue === value;

	return (
		<TabsPrimitive.Trigger
			ref={ref}
			value={value}
			className={cn(
				"ring-offset-background focus-visible:ring-ring data-[state=active]:text-foreground relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
				// 인디케이터는 활성 트리거 안에 있고 layout 애니메이션 동안 옆 트리거
				// 위까지 넘어간다. isolate 로 만든 스택 컨텍스트가 뒤 형제를 덮으므로,
				// 비활성 트리거를 위로 올려 라벨이 가려지지 않게 한다.
				isActive ? "isolate" : "z-10",
				// Tabs 래퍼 없이 TabsPrimitive.Root 와 조합하면 인디케이터가 없다.
				// 그때도 활성 탭이 구분되도록 원래의 표시를 폴백으로 남긴다.
				!indicatorContext &&
					"data-[state=active]:bg-background data-[state=active]:shadow",
				className,
			)}
			{...props}
		>
			{isActive && indicatorContext ? (
				<motion.span
					aria-hidden
					layoutId={indicatorContext.layoutId}
					className="bg-background shadow absolute inset-0 -z-10 rounded-md"
					transition={prefersReducedMotion ? { duration: 0 } : INDICATOR_SPRING}
				/>
			) : null}
			{children}
		</TabsPrimitive.Trigger>
	);
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		className={cn(
			"ring-offset-background focus-visible:ring-ring mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
			className,
		)}
		{...props}
	/>
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
