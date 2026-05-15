import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import type { SavedArticle, DeathArticle } from "@shared/schema";
import { ADMIN_USER_ID } from "@/lib/constants";

export function useSavedArticles() {
  const { isLoggedIn } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery<SavedArticle[]>({
    queryKey: ["/api/saved-articles"],
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  const favourites: SavedArticle[] = isLoggedIn ? (data ?? []) : [];

  const isFavourite = useCallback(
    (link: string) => favourites.some(f => f.link === link),
    [favourites]
  );

  const toggleFavourite = useCallback(async (article: DeathArticle) => {
    if (!isLoggedIn) return;
    const exists = favourites.some(f => f.link === article.link);
    try {
      if (exists) {
        await apiRequest("DELETE", "/api/saved-articles", { link: article.link });
      } else {
        await apiRequest("POST", "/api/saved-articles", {
          userId: ADMIN_USER_ID,
          title: article.title ?? "",
          description: article.description ?? "",
          link: article.link,
          pubDate: article.pubDate ?? "",
          source: article.source ?? "",
          deathSubject: article.deathSubject ?? null,
        });
      }
      qc.invalidateQueries({ queryKey: ["/api/saved-articles"] });
    } catch { }
  }, [isLoggedIn, favourites, qc]);

  const removeFavourite = useCallback(async (link: string) => {
    if (!isLoggedIn) return;
    try {
      await apiRequest("DELETE", "/api/saved-articles", { link });
      qc.invalidateQueries({ queryKey: ["/api/saved-articles"] });
    } catch { }
  }, [isLoggedIn, qc]);

  return { favourites, isFavourite, toggleFavourite, removeFavourite };
}
