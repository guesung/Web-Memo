import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	createContext,
	type PropsWithChildren,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { setMemoAutoSaveOwner } from "@/lib/memoAutoSaveSession";
import { supabase } from "@/lib/supabase/client";

interface AuthContextType {
	session: Session | null;
	isLoading: boolean;
	isLoggedIn: boolean;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	session: null,
	isLoading: true,
	isLoggedIn: false,
	signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
	const [session, setSession] = useState<Session | null>(() => {
		setMemoAutoSaveOwner("guest");
		return null;
	});
	const [isLoading, setIsLoading] = useState(true);
	const queryClient = useQueryClient();
	const previousUserIdRef = useRef<string | null>(null);

	useEffect(() => {
		let hasAuthEvent = false;
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (hasAuthEvent) return;
			setMemoAutoSaveOwner(session?.user.id ?? "guest");
			previousUserIdRef.current = session?.user.id ?? null;
			setSession(session);
			setIsLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			hasAuthEvent = true;
			setIsLoading(false);
			setMemoAutoSaveOwner(session?.user.id ?? "guest");
			const nextUserId = session?.user.id ?? null;
			const previousUserId = previousUserIdRef.current;
			const isAccountSwitched =
				previousUserId !== null &&
				nextUserId !== null &&
				previousUserId !== nextUserId;

			// 블로그 정주행 완료 캐시는 개인 데이터라 로그아웃·계정 전환 때 지운다.
			if (event === "SIGNED_OUT" || isAccountSwitched) {
				queryClient.removeQueries({
					queryKey: QUERY_KEY.blogCompletionPrefix(),
				});
			}
			previousUserIdRef.current = nextUserId;
			setSession(session);
		});

		return () => subscription.unsubscribe();
	}, [queryClient]);

	const signOut = async () => {
		await supabase.auth.signOut();
		setMemoAutoSaveOwner("guest");
		setSession(null);
	};

	const isLoggedIn = !!session;

	return (
		<AuthContext.Provider value={{ session, isLoading, signOut, isLoggedIn }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
