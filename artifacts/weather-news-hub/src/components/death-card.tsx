import type { DeathArticle } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Heart, Share2 } from "lucide-react";
import { getTimeAgo } from "@/lib/date-utils";
import { MUTED_LABEL, FAVOURITE_BTN_CLASSES } from "@/lib/styles";

const DEATH_CARD_CLASSES = {
  wrap:        "group relative",
  card:        "p-4 hover-elevate pr-16",
  body:        "flex flex-col gap-2",
  titleRow:    "flex items-start gap-2",
  title:       "text-sm font-medium leading-snug flex-1",
  extIcon:     "w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
  metaRow:     "flex items-center gap-3 mt-1 flex-wrap",
  clockGroup:  "flex items-center gap-1",
  clockIcon:   "w-3 h-3 text-muted-foreground",
  timeText:    "text-[11px] text-muted-foreground",
  actions:     "absolute top-3 right-3 flex flex-col gap-1",
  shareBtn:    "w-7 h-7 text-muted-foreground hover:text-foreground",
  removeBtn:   "w-7 h-7 text-rose-500 hover:text-rose-600",
  iconSm:      "w-3.5 h-3.5",
  heartFilled: "w-4 h-4 fill-current",
  heartEmpty:  "w-4 h-4",
} as const;

interface DeathCardProps {
  article: DeathArticle;
  index: number;
  isFavourite?: (link: string) => boolean;
  onToggleFavourite?: (article: DeathArticle) => void;
  savedAt?: string;
  onRemove?: (link: string) => void;
}

export function DeathCard({ article, index, isFavourite, onToggleFavourite, savedAt, onRemove }: DeathCardProps) {
  const displayTime = savedAt
    ? `Saved ${getTimeAgo(new Date(savedAt))}`
    : getTimeAgo(new Date(article.pubDate));

  const faved = isFavourite?.(article.link) ?? false;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      try { await navigator.share({ title: article.title, url: article.link }); return; } catch { }
    }
    try { await navigator.clipboard.writeText(article.link); } catch { }
  };

  return (
    <div className={DEATH_CARD_CLASSES.wrap} data-testid={`death-card-${index}`}>
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        data-testid={`link-death-article-${index}`}
      >
        <Card className={DEATH_CARD_CLASSES.card}>
          <div className={DEATH_CARD_CLASSES.body}>
            <div className={DEATH_CARD_CLASSES.titleRow}>
              <h4 className={DEATH_CARD_CLASSES.title} data-testid={`text-death-title-${index}`}>
                {article.title}
              </h4>
              <ExternalLink className={DEATH_CARD_CLASSES.extIcon} aria-hidden="true" />
            </div>
            {article.description && (
              <p className={`${MUTED_LABEL} leading-relaxed line-clamp-2`} data-testid={`text-death-desc-${index}`}>
                {article.description}
              </p>
            )}
            <div className={DEATH_CARD_CLASSES.metaRow}>
              {article.source && (
                <Badge variant="secondary" data-testid={`badge-death-source-${index}`}>
                  {article.source}
                </Badge>
              )}
              <div className={DEATH_CARD_CLASSES.clockGroup}>
                <Clock className={DEATH_CARD_CLASSES.clockIcon} />
                <span className={DEATH_CARD_CLASSES.timeText} data-testid={`text-death-time-${index}`}>
                  {displayTime}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </a>
      <div className={DEATH_CARD_CLASSES.actions}>
        <Button
          size="icon"
          variant="ghost"
          className={DEATH_CARD_CLASSES.shareBtn}
          onClick={handleShare}
          data-testid={`button-share-death-${index}`}
          title="Share"
        >
          <Share2 className={DEATH_CARD_CLASSES.iconSm} />
        </Button>
        {onRemove ? (
          <Button
            size="icon"
            variant="ghost"
            className={DEATH_CARD_CLASSES.removeBtn}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(article.link); }}
            data-testid={`button-remove-death-${index}`}
            title="Remove from saved"
          >
            <Heart className={DEATH_CARD_CLASSES.heartFilled} />
          </Button>
        ) : onToggleFavourite ? (
          <Button
            size="icon"
            variant="ghost"
            className={`${FAVOURITE_BTN_CLASSES.base} ${faved ? FAVOURITE_BTN_CLASSES.active : FAVOURITE_BTN_CLASSES.inactive}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavourite(article); }}
            data-testid={`button-favourite-death-${index}`}
            title={faved ? "Remove from saved" : "Save article"}
          >
            <Heart className={`${DEATH_CARD_CLASSES.heartEmpty} ${faved ? "fill-current" : ""}`} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
