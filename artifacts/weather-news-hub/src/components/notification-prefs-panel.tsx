import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Clock, Plus, X, MoonStar } from "lucide-react";
import {
  DISABLED_TIME_PREFIX,
  NotificationPrefs,
  FREQUENCY_OPTIONS,
  NEWS_COUNT_OPTIONS,
  formatTime,
  getTimeUntil,
} from "@/lib/notification-types";
import {
  PREF_ENABLED,
  PREF_DISABLED,
  MAX_SCHEDULED_TIMES,
  SCHEDULE_MODE_FREQUENCY,
  SCHEDULE_MODE_SCHEDULED,
} from "@/lib/constants";
import { MUTED_LABEL } from "@/lib/styles";
import type { ScheduleMode } from "@/lib/types";

const TIME_CHIP_CLASSES = {
  enabled: {
    chip:   "bg-background",
    clock:  "text-primary",
    button: "",
  },
  disabled: {
    chip:   "bg-muted/40 opacity-60",
    clock:  "text-muted-foreground",
    button: "text-muted-foreground line-through",
  },
} as const;

const PREFS_CLASSES = {
  wrapper:       "flex flex-col gap-4 pt-2 border-t",
  sectionTitle:  "text-sm font-medium",
  prefRow:       "flex items-center justify-between gap-3",
  prefLabel:     "flex-1 min-w-0",
  deliverySection: "border-t pt-3 flex flex-col gap-3",
  modeRow:       "flex gap-2",
  frequencyBlock: "flex flex-col gap-3",
  freqRow:       "flex items-center gap-2",
  quietCard:     "flex flex-col gap-2 rounded-lg border px-3 py-2.5 bg-muted/30",
  quietHeader:   "flex items-center justify-between gap-3",
  quietTitleRow: "flex items-center gap-1.5",
  moonIcon:      "w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400",
  quietRow:      "flex items-center gap-2 flex-wrap",
  timeInput:     "border rounded px-2 py-1 text-xs bg-background text-foreground w-28",
  scheduledBlock:  "flex flex-col gap-2",
  timeChipList:    "flex flex-col gap-1.5",
  newsSummaryWrap: "flex flex-col gap-2",
  chipBase:      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
  chipClockBase: "w-3.5 h-3.5 shrink-0",
  editInput:     "border rounded px-1.5 py-0.5 text-sm bg-background text-foreground w-24 font-medium",
  timeButtonBase: "font-medium w-20 text-left hover:text-primary transition-colors",
  pausedLabel:   `${MUTED_LABEL} flex-1 italic`,
  removeBtn:     "text-muted-foreground hover:text-destructive ml-1",
  removeIcon:    "w-3.5 h-3.5",
  addTimeRow:    "flex items-center gap-2 mt-1",
  newTimeInput:  "border rounded px-2 py-1 text-sm bg-background text-foreground w-32",
  warningText:   "text-xs text-amber-600 dark:text-amber-400",
  selectSm:      "w-28",
  selectMd:      "w-36",
  newsCountRow:  "flex items-center gap-2 pl-1",
  modeIconSm:    "w-3 h-3 mr-1",
  addIcon:       "w-3 h-3 mr-1",
} as const;

interface ScheduledEntry {
  raw: string;
  time: string;
  enabled: boolean;
}

interface NotificationPrefsPanelProps {
  prefs: NotificationPrefs;
  scheduleMode: ScheduleMode;
  newTime: string;
  editingTime: { raw: string; value: string } | null;
  quietHoursEnabled: boolean;
  isSavingPrefs: boolean;
  allScheduledEntries: ScheduledEntry[];
  onSavePrefs: (partial: Partial<NotificationPrefs>) => void;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  onNewTimeChange: (val: string) => void;
  onAddScheduledTime: () => void;
  onRemoveScheduledTime: (raw: string) => void;
  onToggleScheduledTime: (raw: string) => void;
  onEditingTimeChange: (editing: { raw: string; value: string } | null) => void;
  onEditCommit: (raw: string, newValue: string) => void;
  onQuietHoursToggle: (enabled: boolean) => void;
}

export function NotificationPrefsPanel({
  prefs,
  scheduleMode,
  newTime,
  editingTime,
  quietHoursEnabled,
  isSavingPrefs,
  allScheduledEntries,
  onSavePrefs,
  onScheduleModeChange,
  onNewTimeChange,
  onAddScheduledTime,
  onRemoveScheduledTime,
  onToggleScheduledTime,
  onEditingTimeChange,
  onEditCommit,
  onQuietHoursToggle,
}: NotificationPrefsPanelProps) {
  const timeInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={PREFS_CLASSES.wrapper} data-testid="section-notification-prefs">
      <h4 className={PREFS_CLASSES.sectionTitle}>What to receive</h4>

      <div className={PREFS_CLASSES.prefRow}>
        <div className={PREFS_CLASSES.prefLabel}>
          <p className={PREFS_CLASSES.sectionTitle}>Extreme weather alerts</p>
          <p className={MUTED_LABEL}>Snow, storms, extreme heat/cold, high winds, freezing rain</p>
        </div>
        <Switch
          checked={prefs.notifyExtremeWeather === PREF_ENABLED}
          onCheckedChange={(checked) => onSavePrefs({ notifyExtremeWeather: checked ? PREF_ENABLED : PREF_DISABLED })}
          disabled={isSavingPrefs}
          data-testid="switch-extreme-weather"
        />
      </div>

      <div className={PREFS_CLASSES.prefRow}>
        <div className={PREFS_CLASSES.prefLabel}>
          <p className={PREFS_CLASSES.sectionTitle}>General weather updates</p>
          <p className={MUTED_LABEL}>Current conditions, today and tomorrow's forecast summary</p>
        </div>
        <Switch
          checked={prefs.notifyGeneralWeather === PREF_ENABLED}
          onCheckedChange={(checked) => onSavePrefs({ notifyGeneralWeather: checked ? PREF_ENABLED : PREF_DISABLED })}
          disabled={isSavingPrefs}
          data-testid="switch-general-weather"
        />
      </div>

      <div className={PREFS_CLASSES.newsSummaryWrap}>
        <div className={PREFS_CLASSES.prefRow}>
          <div className={PREFS_CLASSES.prefLabel}>
            <p className={PREFS_CLASSES.sectionTitle}>News summary</p>
            <p className={MUTED_LABEL}>Latest local news headlines delivered to you</p>
          </div>
          <Switch
            checked={prefs.notifyNewsSummary === PREF_ENABLED}
            onCheckedChange={(checked) => onSavePrefs({ notifyNewsSummary: checked ? PREF_ENABLED : PREF_DISABLED })}
            disabled={isSavingPrefs}
            data-testid="switch-news-summary"
          />
        </div>
        {prefs.notifyNewsSummary === PREF_ENABLED && (
          <div className={PREFS_CLASSES.newsCountRow}>
            <span className={MUTED_LABEL}>Articles per update:</span>
            <Select
              value={String(prefs.newsArticleCount)}
              onValueChange={(val) => onSavePrefs({ newsArticleCount: parseInt(val) })}
              disabled={isSavingPrefs}
            >
              <SelectTrigger className={PREFS_CLASSES.selectSm} data-testid="select-news-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NEWS_COUNT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-news-count-${opt.value}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className={PREFS_CLASSES.prefRow}>
        <div className={PREFS_CLASSES.prefLabel}>
          <p className={PREFS_CLASSES.sectionTitle}>Celebrity death alerts</p>
          <p className={MUTED_LABEL}>Immediate alerts for notable celebrity deaths from the last 3 days</p>
        </div>
        <Switch
          checked={prefs.notifyCelebrityDeaths === PREF_ENABLED}
          onCheckedChange={(checked) => onSavePrefs({ notifyCelebrityDeaths: checked ? PREF_ENABLED : PREF_DISABLED })}
          disabled={isSavingPrefs}
          data-testid="switch-celebrity-deaths"
        />
      </div>

      <div className={PREFS_CLASSES.deliverySection}>
        <h4 className={PREFS_CLASSES.sectionTitle}>When to deliver</h4>

        <div className={PREFS_CLASSES.modeRow}>
          <Button
            variant={scheduleMode === SCHEDULE_MODE_FREQUENCY ? "default" : "outline"}
            size="sm"
            onClick={() => onScheduleModeChange(SCHEDULE_MODE_FREQUENCY)}
            disabled={isSavingPrefs}
            data-testid="button-mode-frequency"
          >
            <Clock className={PREFS_CLASSES.modeIconSm} />
            Frequency
          </Button>
          <Button
            variant={scheduleMode === SCHEDULE_MODE_SCHEDULED ? "default" : "outline"}
            size="sm"
            onClick={() => onScheduleModeChange(SCHEDULE_MODE_SCHEDULED)}
            disabled={isSavingPrefs}
            data-testid="button-mode-scheduled"
          >
            <Bell className={PREFS_CLASSES.modeIconSm} />
            Scheduled
          </Button>
        </div>

        {scheduleMode === SCHEDULE_MODE_FREQUENCY && (
          <div className={PREFS_CLASSES.frequencyBlock}>
            <div className={PREFS_CLASSES.freqRow}>
              <span className={MUTED_LABEL}>Check every:</span>
              <Select
                value={String(prefs.frequencyMinutes)}
                onValueChange={(val) => onSavePrefs({ frequencyMinutes: parseInt(val) })}
                disabled={isSavingPrefs}
              >
                <SelectTrigger className={PREFS_CLASSES.selectMd} data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-frequency-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={PREFS_CLASSES.quietCard}>
              <div className={PREFS_CLASSES.quietHeader}>
                <div className={PREFS_CLASSES.quietTitleRow}>
                  <MoonStar className={PREFS_CLASSES.moonIcon} />
                  <span className={PREFS_CLASSES.sectionTitle}>Quiet hours</span>
                </div>
                <Switch
                  checked={quietHoursEnabled}
                  onCheckedChange={onQuietHoursToggle}
                  disabled={isSavingPrefs}
                  data-testid="switch-quiet-hours"
                />
              </div>
              {quietHoursEnabled ? (
                <div className={PREFS_CLASSES.quietRow}>
                  <span className={MUTED_LABEL}>No notifications from</span>
                  <input
                    type="time"
                    value={prefs.quietHoursStart ?? "22:00"}
                    onChange={e => onSavePrefs({ quietHoursStart: e.target.value })}
                    className={PREFS_CLASSES.timeInput}
                    data-testid="input-quiet-hours-start"
                  />
                  <span className={MUTED_LABEL}>to</span>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd ?? "07:00"}
                    onChange={e => onSavePrefs({ quietHoursEnd: e.target.value })}
                    className={PREFS_CLASSES.timeInput}
                    data-testid="input-quiet-hours-end"
                  />
                </div>
              ) : (
                <p className={MUTED_LABEL}>
                  Pause notifications during certain hours (e.g. overnight).
                </p>
              )}
            </div>
          </div>
        )}

        {scheduleMode === SCHEDULE_MODE_SCHEDULED && (
          <div className={PREFS_CLASSES.scheduledBlock}>
            <p className={MUTED_LABEL}>
              Pick specific times for daily weather + news updates. Up to {MAX_SCHEDULED_TIMES} times.
            </p>
            {allScheduledEntries.length > 0 && (
              <div className={PREFS_CLASSES.timeChipList} data-testid="list-scheduled-times">
                {allScheduledEntries.map(entry => (
                  <div
                    key={entry.raw}
                    className={`${PREFS_CLASSES.chipBase} ${entry.enabled ? TIME_CHIP_CLASSES.enabled.chip : TIME_CHIP_CLASSES.disabled.chip}`}
                    data-testid={`badge-scheduled-time-${entry.time}`}
                  >
                    <Clock className={`${PREFS_CLASSES.chipClockBase} ${entry.enabled ? TIME_CHIP_CLASSES.enabled.clock : TIME_CHIP_CLASSES.disabled.clock}`} />
                    {editingTime?.raw === entry.raw ? (
                      <input
                        ref={editInputRef}
                        type="time"
                        value={editingTime.value}
                        onChange={e => onEditingTimeChange({ raw: entry.raw, value: e.target.value })}
                        onBlur={() => onEditCommit(entry.raw, editingTime.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") onEditingTimeChange(null);
                        }}
                        className={PREFS_CLASSES.editInput}
                        autoFocus
                        data-testid={`input-edit-time-${entry.time}`}
                      />
                    ) : (
                      <button
                        className={`${PREFS_CLASSES.timeButtonBase} ${entry.enabled ? TIME_CHIP_CLASSES.enabled.button : TIME_CHIP_CLASSES.disabled.button}`}
                        onClick={() => onEditingTimeChange({ raw: entry.raw, value: entry.time })}
                        title="Click to edit time"
                        data-testid={`button-edit-time-${entry.time}`}
                      >
                        {formatTime(entry.time)}
                      </button>
                    )}
                    {editingTime?.raw !== entry.raw && entry.enabled && (
                      <span className={`${MUTED_LABEL} flex-1`}>in {getTimeUntil(entry.time)}</span>
                    )}
                    {editingTime?.raw !== entry.raw && !entry.enabled && (
                      <span className={PREFS_CLASSES.pausedLabel}>paused</span>
                    )}
                    {editingTime?.raw === entry.raw && (
                      <span className={`${MUTED_LABEL} flex-1`}>press Enter or click away to save</span>
                    )}
                    <Switch
                      checked={entry.enabled}
                      onCheckedChange={() => onToggleScheduledTime(entry.raw)}
                      disabled={isSavingPrefs || editingTime?.raw === entry.raw}
                      data-testid={`switch-scheduled-time-${entry.time}`}
                    />
                    <button
                      onClick={() => onRemoveScheduledTime(entry.raw)}
                      disabled={isSavingPrefs}
                      className={PREFS_CLASSES.removeBtn}
                      data-testid={`button-remove-time-${entry.time}`}
                    >
                      <X className={PREFS_CLASSES.removeIcon} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {allScheduledEntries.length < 6 && (
              <div className={PREFS_CLASSES.addTimeRow}>
                <input
                  ref={timeInputRef}
                  type="time"
                  value={newTime}
                  onChange={e => onNewTimeChange(e.target.value)}
                  className={PREFS_CLASSES.newTimeInput}
                  data-testid="input-new-time"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddScheduledTime}
                  disabled={isSavingPrefs || !newTime}
                  data-testid="button-add-time"
                >
                  <Plus className={PREFS_CLASSES.addIcon} />
                  Add
                </Button>
              </div>
            )}
            {allScheduledEntries.length === 0 && (
              <p className={PREFS_CLASSES.warningText}>
                Add at least one time to use scheduled delivery.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
