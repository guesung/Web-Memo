"use server";

import type { LanguageType } from "@src/modules/i18n";
import { SidebarTrigger } from "@web-memo/ui";
import { Suspense } from "react";

import type { TMemoFilter, TMemoSearchParams } from "../../_types";
import MemoSearchForm from "../MemoSearchForm";
import MemoSearchFormProvider from "../MemoSearchFormProvider";
import ClientMemoView from "../MemoView/ClientMemoView";
import { MemoViewSkeleton } from "../MemoView/MemoListSkeleton";
import MemoListHydrationBoundary from "./MemoListHydrationBoundary";
import MemoShellProbe from "./MemoShellProbe";

interface IFMemoPageProps extends LanguageType {
	/** 이 화면이 보여줄 메모의 범위. 넘기지 않으면 전체를 본다 */
	filter?: TMemoFilter;
	/** 서버에서 첫 페이지를 미리 조회할 조건. 넘기지 않으면 prefetch하지 않는다 */
	searchParams?: TMemoSearchParams;
}

/**
 * 메모 목록 화면의 본체.
 *
 * @description `/memos`와 `/memos/{wish,star,reading}`이 같은 화면을 쓴다. 필터만 라우트가
 * 정하고 나머지는 전부 같으므로, 라우트마다 화면을 따로 두지 않고 이 컴포넌트를 공유한다.
 */
export default async function MemoPage({
	lng,
	filter = "all",
	searchParams,
}: IFMemoPageProps) {
	// 헤더 여백(HeaderMargin, 3rem)은 layout이 이미 넣는다. 100vh를 그대로 쓰면
	// 그만큼 문서가 길어져 내용이 짧아도 스크롤이 생긴다.
	return (
		<div className="min-h-[calc(100vh-3rem)]">
			<MemoShellProbe
				key={filter}
				route={filter === "all" ? "/memos" : `/memos/${filter}`}
			/>
			<div className="md:hidden fixed top-20 left-4 z-40">
				<SidebarTrigger className="shadow-lg shadow-primary/10 hover:shadow-primary/20 bg-card border border-border hover:border-primary/50 transition-all duration-200 hover:scale-110 active:scale-95" />
			</div>

			<div className="flex flex-col px-4 md:px-6 py-4">
				<MemoSearchFormProvider>
					<div className="mb-6">
						<MemoSearchForm lng={lng} />
					</div>
					{/*
					 * 비동기 경계는 Suspense 바깥에 둔다. 안에 두면 서버가 이 Suspense를 폴백 먼저·내용 나중으로
					 * 나눠 스트리밍해, 브라우저가 목록 자리를 늦은(Idle) 레인에서 하이드레이션하고 목록 공개도 그만큼
					 * 밀렸다. 이 경계가 기다리는 것은 searchParams와 cookies()뿐이라 바깥에 둬도 셸이 늦어지지 않는다.
					 */}
					{searchParams ? (
						<MemoListHydrationBoundary
							filter={filter}
							searchParams={searchParams}
						>
							<Suspense fallback={<MemoViewSkeleton />}>
								<ClientMemoView lng={lng} filter={filter} />
							</Suspense>
						</MemoListHydrationBoundary>
					) : (
						<Suspense fallback={<MemoViewSkeleton />}>
							<ClientMemoView lng={lng} filter={filter} />
						</Suspense>
					)}
				</MemoSearchFormProvider>
			</div>
		</div>
	);
}
