import { toErrorWithMessage } from "@src/utils";
import { useState } from "react";

export default function useError() {
	const [error, setError] = useState<Error | null>(null);

	if (error) throw toErrorWithMessage(error);

	return { error, setError } as const;
}
