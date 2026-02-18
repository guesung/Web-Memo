import { QueryClient } from "@tanstack/react-query";
// @ts-expect-error — React.cache is available in RSC but not typed in @types/react@18
import { cache } from "react";

export const getQueryClient = cache(() => new QueryClient());
