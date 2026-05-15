import type { NewsArticle } from "@shared/schema";
import type { FavouriteArticle } from "@/hooks/use-favourites";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Newspaper, Clock, Heart, BookmarkX, Trash2, Share2 } from "lucide-react";
import { getTimeAgo } from "@/lib/date-utils";
import { MUTED_LABEL, TEXT_SM_MUTED, EMPTY_STATE, FAVOURITE_BTN_CLASSES } from "@/lib/styles";

const NEWS_CLASSES = {
  list:          "flex flex-col gap-3",
  skeletonInner: "flex flex-col gap-2",
  emptyIcon:     "w-10 h-10 text-muted-foreground",
  emptyLarge:    "p-10 flex flex-col items-center gap-3 text-center",
  emptyTitle:    "text-base font-medium text-muted-foreground",
  emptyBody:     `${TEXT_SM_MUTED} max-w-xs`,
  cardWrap:      "group relative",
  card:          "p-4 hover-elevate pr-16",
  cardBody:      "flex flex-col gap-2",
  titleRow:      "flex items-start gap-2",
  title:         "text-sm font-medium leading-snug flex-1",
  extIcon:       "w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
  description:   `${MUTED_LABEL} leading-relaxed line-clamp-2`,
  metaRow:       "flex items-center gap-3 mt-1 flex-wrap",
  clockGroup:    "flex items-center gap-1",
  clockIcon:     "w-3 h-3 text-muted-foreground",
  timeText:      "text-[11px] text-muted-foreground",
  actions:       "absolute top-3 right-3 flex flex-col gap-1",
  shareBtn:      "w-7 h-7 text-muted-foreground hover:text-foreground",
  removeBtn:     "w-7 h-7 text-muted-foreground hover:text-destructive",
  actionIconSm:  "w-3.5 h-3.5",
  heartIcon:     "w-4 h-4",
  savedHeader:   "flex items-center justify-between",
  savedCount:    TEXT_SM_MUTED,
  clearBtn:      "text-muted-foreground hover:text-destructive",
  trashIcon:     "w-3.5 h-3.5 mr-1",
} as const;

interface NewsFeedProps {
  articles: NewsArticle[];
  isLoading: boolean;
  isFavourite?: (link: string) => boolean;
  onToggleFavourite?: (article: NewsArticle) => void;
}

interface SavedFeedProps {
  articles: FavouriteArticle[];
  onRemove: (link: string) => void;
  onClearAll: () => void;
}

export function NewsFeed({ articles, isLoading, isFavourite, onToggleFavourite }: NewsFeedProps) {
  if (isLoading) {
    return (
      <div className={NEWS_CLASSES.list}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className={NEWS_CLASSES.skeletonInner}>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <Card className={EMPTY_STATE}>
        <Newspaper className={NEWS_CLASSES.emptyIcon} />
        <p className={TEXT_SM_MUTED} data-testid="text-no-news">
          No news articles available right now
        </p>
      </Card>
    );
  }

  return (
    <div className={NEWS_CLASSES.list}>
      {articles.map((article, index) => (
        <ArticleCard
          key={article.link || index}
          article={article}
          index={index}
          isFavourite={isFavourite?.(article.link) ?? false}
          onToggleFavourite={onToggleFavourite}
        />
      ))}
    </div>
  );
}

interface ArticleCardProps {
  article: NewsArticle;
  index: number;
  isFavourite: boolean;
  onToggleFavourite?: (article: NewsArticle) => void;
  savedAt?: string;
  onRemove?: (link: string) => void;
}

async function shareArticle(article: NewsArticle) {
  if (navigator.share) {
    try {
      await navigator.share({ title: article.title, url: article.link });
      return;
    } catch { }
  }
  try {
    await navigator.clipboard.writeText(article.link);
  } catch { }
}

function ArticleCard({ article, index, isFavourite, onToggleFavourite, savedAt, onRemove }: ArticleCardProps) {
  const pubDate = new Date(article.pubDate);
  const timeAgo = getTimeAgo(pubDate);

  return (
    <div className={NEWS_CLASSES.cardWrap} data-testid={`article-card-${index}`}>
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        data-testid={`link-news-article-${index}`}
      >
        <Card className={NEWS_CLASSES.card}>
          <div className={NEWS_CLASSES.cardBody}>
            <div className={NEWS_CLASSES.titleRow}>
              <h4
                className={NEWS_CLASSES.title}
                data-testid={`text-news-title-${index}`}
              >
                {article.title}
              </h4>
              <ExternalLink
                className={NEWS_CLASSES.extIcon}
                aria-hidden="true"
              />
            </div>
            {article.description && (
              <p
                className={NEWS_CLASSES.description}
                data-testid={`text-news-desc-${index}`}
              >
                {article.description}
              </p>
            )}
            <div className={NEWS_CLASSES.metaRow}>
              <Badge variant="secondary" data-testid={`badge-news-source-${index}`}>
                {article.source}
              </Badge>
              <div className={NEWS_CLASSES.clockGroup}>
                <Clock className={NEWS_CLASSES.clockIcon} />
                <span
                  className={NEWS_CLASSES.timeText}
                  data-testid={`text-news-time-${index}`}
                >
                  {savedAt ? `Saved ${getTimeAgo(new Date(savedAt))}` : timeAgo}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </a>

      <div className={NEWS_CLASSES.actions}>
        <Button
          size="icon"
          variant="ghost"
          className={NEWS_CLASSES.shareBtn}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            shareArticle(article);
          }}
          data-testid={`button-share-${index}`}
          title="Share article"
        >
          <Share2 className={NEWS_CLASSES.actionIconSm} />
        </Button>
        {onToggleFavourite && (
          <Button
            size="icon"
            variant="ghost"
            className={`${FAVOURITE_BTN_CLASSES.base} ${isFavourite ? FAVOURITE_BTN_CLASSES.active : FAVOURITE_BTN_CLASSES.inactive}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavourite(article);
            }}
            data-testid={`button-favourite-${index}`}
            title={isFavourite ? "Remove from saved" : "Save article"}
          >
            <Heart className={`${NEWS_CLASSES.heartIcon} ${isFavourite ? "fill-current" : ""}`} />
          </Button>
        )}
        {onRemove && (
          <Button
            size="icon"
            variant="ghost"
            className={NEWS_CLASSES.removeBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(article.link);
            }}
            data-testid={`button-remove-saved-${index}`}
            title="Remove from saved"
          >
            <BookmarkX className={NEWS_CLASSES.heartIcon} />
          </Button>
        )}
      </div>
    </div>
  );
}

export function SavedFeed({ articles, onRemove, onClearAll }: SavedFeedProps) {
  if (articles.length === 0) {
    return (
      <Card className={NEWS_CLASSES.emptyLarge}>
        <Heart className={NEWS_CLASSES.emptyIcon} />
        <p className={NEWS_CLASSES.emptyTitle}>No saved articles yet</p>
        <p className={NEWS_CLASSES.emptyBody}>
          Tap the heart icon on any article to save it here. Saved articles are stored on this device even after they leave the feed.
        </p>
      </Card>
    );
  }

  return (
    <div className={NEWS_CLASSES.list}>
      <div className={NEWS_CLASSES.savedHeader}>
        <p className={NEWS_CLASSES.savedCount}>
          {articles.length} saved {articles.length === 1 ? "article" : "articles"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className={NEWS_CLASSES.clearBtn}
          onClick={onClearAll}
          data-testid="button-clear-all-saved"
        >
          <Trash2 className={NEWS_CLASSES.trashIcon} />
          Clear all
        </Button>
      </div>
      {articles.map((article, index) => (
        <ArticleCard
          key={article.link || index}
          article={article}
          index={index}
          isFavourite={true}
          savedAt={article.savedAt}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

