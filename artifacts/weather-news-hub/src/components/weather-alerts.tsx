import { type WeatherAlert } from "@/lib/weather-utils";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MUTED_LABEL, TEXT_SM_MUTED } from "@/lib/styles";

interface WeatherAlertsProps {
  alerts: WeatherAlert[];
}

const SEVERITY_STYLES = {
  danger: {
    card:  "border-red-300   dark:border-red-800   bg-red-500/5   dark:bg-red-500/10",
    text:  "text-red-600     dark:text-red-400",
    label: "Danger",
  },
  warning: {
    card:  "border-amber-300 dark:border-amber-800 bg-amber-500/5 dark:bg-amber-500/10",
    text:  "text-amber-600   dark:text-amber-400",
    label: "Warning",
  },
} as const;

const ALERT_CLASSES = {
  list:       "flex flex-col gap-2",
  cardBase:   "rounded-md border p-3 flex items-start gap-3",
  iconWrap:   "shrink-0 mt-0.5",
  body:       "flex-1 min-w-0",
  titleRow:   "flex items-center gap-2 flex-wrap",
  titleText:  "text-sm font-semibold",
  message:    `${TEXT_SM_MUTED} mt-0.5`,
  dismiss:    "shrink-0",
  dismissIcon: "w-3.5 h-3.5",
  alertIcon:  "w-5 h-5",
  dangerIcon: "text-red-500",
  warnIcon:   "text-amber-500",
} as const;

export function WeatherAlerts({ alerts }: WeatherAlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (alerts.length === 0) return null;

  const visible = alerts.filter(a => !dismissed.has(`${a.type}-${a.when}`));
  if (visible.length === 0) return null;

  const handleDismiss = (alert: WeatherAlert) => {
    setDismissed(prev => new Set(prev).add(`${alert.type}-${alert.when}`));
  };

  return (
    <div className={ALERT_CLASSES.list} data-testid="weather-alerts">
      {visible.map((alert, i) => {
        const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.warning;
        return (
          <div
            key={`${alert.type}-${alert.when}-${i}`}
            className={`${ALERT_CLASSES.cardBase} ${styles.card}`}
            data-testid={`alert-${alert.type.toLowerCase().replace(/\s+/g, "-")}-${i}`}
          >
            <div className={ALERT_CLASSES.iconWrap}>
              {alert.severity === "danger"
                ? <ShieldAlert className={`${ALERT_CLASSES.alertIcon} ${ALERT_CLASSES.dangerIcon}`} />
                : <AlertTriangle className={`${ALERT_CLASSES.alertIcon} ${ALERT_CLASSES.warnIcon}`} />
              }
            </div>
            <div className={ALERT_CLASSES.body}>
              <div className={ALERT_CLASSES.titleRow}>
                <span
                  className={`${ALERT_CLASSES.titleText} ${styles.text}`}
                  data-testid={`text-alert-type-${i}`}
                >
                  {styles.label}: {alert.type}
                </span>
                <span className={MUTED_LABEL} data-testid={`text-alert-when-${i}`}>
                  {alert.when}
                </span>
              </div>
              <p className={ALERT_CLASSES.message} data-testid={`text-alert-message-${i}`}>
                {alert.message}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className={ALERT_CLASSES.dismiss}
              onClick={() => handleDismiss(alert)}
              data-testid={`button-dismiss-alert-${i}`}
            >
              <X className={ALERT_CLASSES.dismissIcon} />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
