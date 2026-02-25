import {
  addFavorite,
  getAllFavorites,
  isFavorite,
  removeFavorite,
} from "@/lib/storage/favorites";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const FAVORITES_KEY = ["favorites"];

export function useFavorites() {
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: getAllFavorites,
  });
}

export function useIsFavorite(url: string) {
  return useQuery({
    queryKey: [...FAVORITES_KEY, "check", url],
    queryFn: () => isFavorite(url),
    enabled: !!url,
  });
}

export function useFavoriteAdd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
}

export function useFavoriteRemove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
}

export function useFavoriteToggle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      url: string;
      title: string;
      favIconUrl?: string;
      currentIsFavorite: boolean;
    }) => {
      if (params.currentIsFavorite) {
        await removeFavorite(params.url);
      } else {
        await addFavorite({
          url: params.url,
          title: params.title,
          favIconUrl: params.favIconUrl,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
}
