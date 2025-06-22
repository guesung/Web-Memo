import { useState } from "react";
import { toErrorWithMessage } from "../../utils";

export default function useError() {
	const [error, setError] = useState<Error | null>(null);

	if (error) throw toErrorWithMessage(error);

	return { error, setError } as const;
}
