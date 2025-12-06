import type { Session } from "@supabase/supabase-js";
import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase/client";

interface AuthContextType {
	session: Session | null;
	isLoading: boolean;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [session, setSession] = useState<Session | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setIsLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	async function signOut() {
		await supabase.auth.signOut();
		setSession(null);
	}

	return (
		<AuthContext.Provider value={{ session, isLoading, signOut }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextType {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
