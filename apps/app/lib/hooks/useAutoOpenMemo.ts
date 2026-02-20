import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocalMemoByUrl } from "@/lib/hooks/useLocalMemos";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";

interface UseAutoOpenMemoParams {
  url: string;
  isMemoOpen: boolean;
  contentHeight: number;
  openPanel: () => void;
}

export function useAutoOpenMemo({
  url,
  isMemoOpen,
  contentHeight,
  openPanel,
}: UseAutoOpenMemoParams) {
  const { session } = useAuth();
  const isLoggedIn = !!session;

  const { data: localMemo } = useLocalMemoByUrl(url);
  const { data: supabaseMemo } = useSupabaseMemoByUrl(url, isLoggedIn);

  const existingMemo = isLoggedIn ? supabaseMemo : localMemo;
  const hasMemo = !!existingMemo?.memo;

  const manuallyClosed = useRef<Set<string>>(new Set());
  const lastAutoOpenedUrl = useRef<string>("");

  useEffect(() => {
    manuallyClosed.current.delete(url);
    lastAutoOpenedUrl.current = "";
  }, [url]);

  useEffect(() => {
    if (
      hasMemo &&
      !isMemoOpen &&
      contentHeight > 0 &&
      !manuallyClosed.current.has(url) &&
      lastAutoOpenedUrl.current !== url
    ) {
      lastAutoOpenedUrl.current = url;
      openPanel();
    }
  }, [hasMemo, isMemoOpen, contentHeight, url, openPanel]);

  const markManuallyClosed = (closedUrl: string) => {
    manuallyClosed.current.add(closedUrl);
  };

  return { markManuallyClosed };
}
