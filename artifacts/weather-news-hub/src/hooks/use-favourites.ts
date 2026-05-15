import { useState, useEffect, useCallback } from "react";
import type { NewsArticle } from "@shared/schema";
import { FAVOURITES_STORAGE_KEY, MAX_FAVOURITES } from "@/lib/constants";

export interface FavouriteArticle extends NewsArticle {
  savedAt: string;
}

const STORAGE_KEY = FAVOURITES_STORAGE_KEY;

function loadFromStorage(): FavouriteArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavouriteArticle[];
  } catch {
    return [];
  }
}

function saveToStorage(articles: FavouriteArticle[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch { }
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<FavouriteArticle[]>([]);

  useEffect(() => {
    setFavourites(loadFromStorage());
  }, []);

  const isFavourite = useCallback(
    (link: string) => favourites.some(f => f.link === link),
    [favourites]
  );

  const addFavourite = useCallback((article: NewsArticle) => {
    setFavourites(prev => {
      if (prev.some(f => f.link === article.link)) return prev;
      const updated = [{ ...article, savedAt: new Date().toISOString() }, ...prev].slice(0, MAX_FAVOURITES);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeFavourite = useCallback((link: string) => {
    setFavourites(prev => {
      const updated = prev.filter(f => f.link !== link);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const toggleFavourite = useCallback((article: NewsArticle) => {
    setFavourites(prev => {
      const exists = prev.some(f => f.link === article.link);
      const updated = exists
        ? prev.filter(f => f.link !== article.link)
        : [{ ...article, savedAt: new Date().toISOString() }, ...prev].slice(0, MAX_FAVOURITES);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearFavourites = useCallback(() => {
    setFavourites([]);
    saveToStorage([]);
  }, []);

  return { favourites, isFavourite, addFavourite, removeFavourite, toggleFavourite, clearFavourites };
}
