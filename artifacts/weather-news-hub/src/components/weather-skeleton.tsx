import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_CLASSES = {
  outer:        "flex flex-col gap-4",
  currentCard:  "p-6",
  innerGroup:   "flex flex-col gap-4",
  locationRow:  "flex items-center gap-2",
  mainRow:      "flex items-center gap-6",
  iconGroup:    "flex items-center gap-4",
  statsGrid:    "grid grid-cols-2 gap-x-6 gap-y-3 ml-auto",
  statRow:      "flex items-center gap-2",
  forecastCard: "p-4",
  forecastScroll: "flex gap-3",
  forecastItem: "flex flex-col items-center gap-2 min-w-[90px] p-3 rounded-md bg-muted/40",
  hourlyCard:   "p-4",
  hourlyList:   "flex flex-col gap-2",
} as const;

export function WeatherSkeleton() {
  return (
    <div className={SKELETON_CLASSES.outer}>
      <Card className={SKELETON_CLASSES.currentCard}>
        <div className={SKELETON_CLASSES.innerGroup}>
          <div className={SKELETON_CLASSES.locationRow}>
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-40 ml-auto rounded-md" />
          </div>
          <div className={SKELETON_CLASSES.mainRow}>
            <div className={SKELETON_CLASSES.iconGroup}>
              <Skeleton className="w-[72px] h-[72px] rounded-md" />
              <div>
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-4 w-20 mt-2" />
              </div>
            </div>
            <div className={SKELETON_CLASSES.statsGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={SKELETON_CLASSES.statRow}>
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div>
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-10 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className={SKELETON_CLASSES.forecastCard}>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className={SKELETON_CLASSES.forecastScroll}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={SKELETON_CLASSES.forecastItem}>
              <Skeleton className="h-3 w-10" />
              <Skeleton className="w-7 h-7 rounded-full" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-2 w-12" />
              <Skeleton className="h-2 w-8" />
              <Skeleton className="h-2 w-10" />
            </div>
          ))}
        </div>
      </Card>

      <Card className={SKELETON_CLASSES.hourlyCard}>
        <Skeleton className="h-4 w-44 mb-4" />
        <Skeleton className="h-5 w-full mb-5" />
        <div className={SKELETON_CLASSES.hourlyList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </Card>
    </div>
  );
}
