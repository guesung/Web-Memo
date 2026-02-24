import type { Session } from "@supabase/supabase-js";
import {
	createContext,
	type PropsWithChildren,
	useContext,
	useEffect,
	useState,
} from "react";
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

		return () => subscription.unsubscribe();
	}, []);

	const signOut = async () => {
		await supabase.auth.signOut();
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
