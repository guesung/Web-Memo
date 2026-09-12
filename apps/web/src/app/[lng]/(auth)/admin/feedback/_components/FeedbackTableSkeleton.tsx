"use client";

import {
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web-memo/ui";

/** 스켈레톤으로 깔아둘 행 수. 한 페이지가 다 차기 전에도 표 높이가 흔들리지 않을 만큼만 둔다. */
const SKELETON_ROW_COUNT = 8;

/**
 * 피드백 표 로딩 스켈레톤.
 * @description 스피너 대신 표와 같은 모양으로 깔아 목록이 들어올 때 레이아웃이 튀지 않게 한다.
 */
export default function FeedbackTableSkeleton() {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-40">
							<Skeleton className="h-4 w-20" />
						</TableHead>
						<TableHead>
							<Skeleton className="h-4 w-16" />
						</TableHead>
						<TableHead className="w-72">
							<Skeleton className="h-4 w-20" />
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index).map(
						(index) => (
							<TableRow key={index}>
								<TableCell>
									<Skeleton className="h-4 w-24" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-full" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-40" />
								</TableCell>
							</TableRow>
						),
					)}
				</TableBody>
			</Table>
		</div>
	);
}
