"use client";

import { Button, Loading } from "@web-memo/ui";
import Image from "next/image";
import { useState } from "react";

/**
 * 제공자 버튼의 브랜드 스타일입니다.
 * @description OAuth 제공자 가이드라인이 색을 지정하므로 역할 토큰 대신 브랜드 색을 그대로 씁니다.
 */
const PROVIDER_BUTTON_CLASS_NAME: Record<TLoginProviderId, string> = {
	kakao: "bg-[#FEE500] hover:bg-[#F5DC00] text-gray-900",
	google: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200",
	apple: "bg-black hover:bg-gray-900 text-white",
};

/**
 * OAuth 제공자 로그인 버튼 3종입니다.
 * @description 버튼을 누르면 제공자 화면으로 떠나기까지 시간이 걸려 같은 버튼을 다시 누르는
 * 일이 잦습니다. 누른 버튼은 진행 중 라벨로 바뀌고 세 버튼 모두 잠깁니다.
 *
 * 서버 액션은 formAction으로 묶여 있어 상위 서버 컴포넌트에서 만들어 내려받습니다.
 */
export default function LoginProviderButtons({
	providers,
}: IFLoginProviderButtonsProps) {
	const [pendingProviderId, setPendingProviderId] =
		useState<TLoginProviderId | null>(null);

	const handleProviderButtonClick = (providerId: TLoginProviderId) => {
		setPendingProviderId(providerId);
	};

	return (
		<>
			{providers.map(({ id, label, pendingLabel, signIn }) => {
				const isPending = pendingProviderId === id;

				return (
					<Button
						key={id}
						formAction={signIn}
						onClick={() => handleProviderButtonClick(id)}
						disabled={pendingProviderId !== null}
						data-login-method={id}
						data-testid={`${id}-login-button`}
						className={`h-12 gap-2 rounded-xl font-medium shadow-sm transition-colors ${PROVIDER_BUTTON_CLASS_NAME[id]}`}
					>
						{isPending ? (
							<Loading className="m-0" />
						) : (
							<Image
								src={`/images/svgs/${id}.svg`}
								width={20}
								height={20}
								alt=""
							/>
						)}
						{isPending ? pendingLabel : label}
					</Button>
				);
			})}
		</>
	);
}

/** 로그인 제공자 식별자입니다. */
type TLoginProviderId = "kakao" | "google" | "apple";

/** 로그인 제공자 버튼 하나에 필요한 값입니다. */
type TLoginProvider = {
	/** 제공자 식별자. 로고 파일명·트래킹 값으로도 씁니다 */
	id: TLoginProviderId;
	/** 평상시 버튼 라벨 */
	label: string;
	/** 제공자 화면으로 이동하는 동안 보여줄 라벨 */
	pendingLabel: string;
	/** 제공자에 바인딩된 로그인 서버 액션 */
	signIn: () => Promise<void>;
};

/** LoginProviderButtons의 props입니다. */
interface IFLoginProviderButtonsProps {
	/** 화면에 그릴 제공자 버튼 목록 */
	providers: TLoginProvider[];
}
