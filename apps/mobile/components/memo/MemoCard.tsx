import { StyleSheet, Text, View } from "react-native";
import { ExternalLink } from "lucide-react-native";

import type { Memo } from "@/lib/hooks/useMemos";

interface MemoCardProps {
	memo: Memo;
}

export function MemoCard({ memo }: MemoCardProps) {
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return "오늘";
		}
		if (diffDays === 1) {
			return "어제";
		}
		if (diffDays < 7) {
			return `${diffDays}일 전`;
		}
		return date.toLocaleDateString("ko-KR", {
			month: "short",
			day: "numeric",
		});
	}

	function extractDomain(url: string): string {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname.replace("www.", "");
		} catch {
			return url;
		}
	}

	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<View style={styles.domainContainer}>
					<ExternalLink size={14} color="#666" />
					<Text style={styles.domain}>{extractDomain(memo.url)}</Text>
				</View>
				<Text style={styles.date}>{formatDate(memo.created_at)}</Text>
			</View>

			{memo.title && (
				<Text style={styles.title} numberOfLines={2}>
					{memo.title}
				</Text>
			)}

			<Text style={styles.content} numberOfLines={3}>
				{memo.content}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	domainContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	domain: {
		fontSize: 12,
		color: "#666",
	},
	date: {
		fontSize: 12,
		color: "#999",
	},
	title: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1a1a1a",
		marginBottom: 8,
	},
	content: {
		fontSize: 14,
		color: "#666",
		lineHeight: 20,
	},
});
