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

/** 스켈레톤으로 깔아둘 행 수. 목록이 다 차기 전에도 표 높이가 흔들리지 않을 만큼만 둔다. */
const SKELETON_ROW_COUNT = 8;

/**
 * 사용자 표 로딩 스켈레톤.
 * @description 스피너 대신 표와 같은 모양으로 깔아 목록이 들어올 때 레이아웃이 튀지 않게 한다.
 * 숨김 규칙(`hidden sm:table-cell` 등)도 표와 똑같이 맞춰야 좁은 화면에서 열 수가 달라지지 않는다.
 */
export default function UserTableSkeleton() {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="hidden sm:table-cell">
							<Skeleton className="h-4 w-16" />
						</TableHead>
						<TableHead className="hidden lg:table-cell">
							<Skeleton className="h-4 w-20" />
						</TableHead>
						<TableHead>
							<Skeleton className="h-4 w-16" />
						</TableHead>
						<TableHead>
							<Skeleton className="h-4 w-14" />
						</TableHead>
						<TableHead>
							<Skeleton className="h-4 w-20" />
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index).map(
						(index) => (
							<TableRow key={index}>
								<TableCell className="hidden sm:table-cell">
									<Skeleton className="h-4 w-20" />
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<Skeleton className="h-4 w-48" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-40" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-8" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-16" />
								</TableCell>
							</TableRow>
						),
					)}
				</TableBody>
			</Table>
		</div>
	);
}
