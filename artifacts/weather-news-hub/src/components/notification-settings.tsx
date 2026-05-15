import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, BellRing, Send, Settings, ChevronDown, ChevronUp, Clock, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NotificationPrefsPanel } from "./notification-prefs-panel";
import {
  DISABLED_TIME_PREFIX,
  NotificationPrefs,
  FREQUENCY_OPTIONS,
  urlBase64ToUint8Array,
  getNextScheduledTime,
  getNextFrequencyTime,
  formatTime,
} from "@/lib/notification-types";
import {
  PREF_ENABLED,
  PREF_DISABLED,
  DEFAULT_FREQUENCY_MINUTES,
  DEFAULT_NEWS_ARTICLE_COUNT,
  MAX_SCHEDULED_TIMES,
  SCHEDULE_MODE_FREQUENCY,
  SCHEDULE_MODE_SCHEDULED,
  FALLBACK_LOCATION_NAME,
  FALLBACK_LAT,
  FALLBACK_LON,
} from "@/lib/constants";
import { MUTED_LABEL, TEXT_SM_MUTED } from "@/lib/styles";
import type { ScheduleMode } from "@/lib/types";

const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : "An unexpected error occurred.";

type SubscriptionStatus = "unsupported" | "loading" | "unsubscribed" | "subscribed" | "denied";

const DEFAULT_PREFS: NotificationPrefs = {
  notifyExtremeWeather: PREF_ENABLED,
  notifyGeneralWeather: PREF_DISABLED,
  notifyNewsSummary:    PREF_DISABLED,
  notifyCelebrityDeaths: PREF_ENABLED,
  frequencyMinutes: DEFAULT_FREQUENCY_MINUTES,
  newsArticleCount: DEFAULT_NEWS_ARTICLE_COUNT,
  scheduledTimes: "",
  lastNotifiedAt: null,
  quietHoursStart: null,
  quietHoursEnd: null,
};

const SETTINGS_CLASSES = {
  header:       "flex flex-row items-center gap-2 pb-2",
  headerIcon:   "w-5 h-5 text-muted-foreground",
  badgeWrap:    "ml-auto",
  content:      "flex flex-col gap-3",
  descBlock:    "flex flex-col gap-0.5",
  nextLabel:    `${MUTED_LABEL} flex items-center gap-1`,
  clockIcon:    "w-3 h-3 shrink-0",
  quietPill:    "ml-1 text-indigo-500 dark:text-indigo-400",
  buttonRow:    "flex items-center gap-2 flex-wrap",
  btnIcon:      "w-4 h-4 mr-1",
  chevronIcon:  "w-3 h-3 ml-1",
} as const;

export function NotificationSettings() {
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(SCHEDULE_MODE_FREQUENCY);
  const [newTime, setNewTime] = useState("08:00");
  const [editingTime, setEditingTime] = useState<{ raw: string; value: string } | null>(null);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const { toast } = useToast();

  const getEndpoint = useCallback(async (): Promise<string | null> => {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        return subscription?.endpoint || null;
      }
    } catch { }
    return null;
  }, []);

  const loadPrefs = useCallback(async () => {
    const endpoint = await getEndpoint();
    if (!endpoint) return;
    try {
      const res = await fetch(`/api/push/preferences?endpoint=${encodeURIComponent(endpoint)}`);
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          ...data,
          scheduledTimes: data.scheduledTimes ?? "",
          lastNotifiedAt: data.lastNotifiedAt ?? null,
          quietHoursStart: data.quietHoursStart ?? null,
          quietHoursEnd: data.quietHoursEnd ?? null,
        });
        const anyTimes = (data.scheduledTimes ?? "").split(",").map((t: string) => t.trim()).filter(Boolean).length > 0;
        setScheduleMode(anyTimes ? SCHEDULE_MODE_SCHEDULED : SCHEDULE_MODE_FREQUENCY);
        setQuietHoursEnabled(!!(data.quietHoursStart && data.quietHoursEnd));
      }
    } catch { }
  }, [getEndpoint]);

  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) { setStatus("subscribed"); return; }
      }
      setStatus("unsubscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }, []);

  useEffect(() => { checkSubscription(); }, [checkSubscription]);
  useEffect(() => { if (status === "subscribed") loadPrefs(); }, [status, loadPrefs]);

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        toast({ title: "Permission denied", description: "Notification permission was denied.", variant: "destructive" });
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const res = await fetch("/api/vapid-public-key");
      const { publicKey } = await res.json();
      if (!publicKey) {
        toast({ title: "Configuration error", description: "VAPID keys are not configured on the server.", variant: "destructive" });
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });
      const subJson = subscription.toJSON();
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        locationName: FALLBACK_LOCATION_NAME,
        latitude: String(FALLBACK_LAT),
        longitude: String(FALLBACK_LON),
      });
      setStatus("subscribed");
      toast({ title: "Subscribed", description: "You will receive weather notifications. Customise what you receive below." });
    } catch (e: unknown) {
      toast({ title: "Subscription failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsProcessing(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await apiRequest("POST", "/api/push/unsubscribe", { endpoint: subscription.endpoint });
          await subscription.unsubscribe();
        }
      }
      setStatus("unsubscribed");
      setShowPrefs(false);
      toast({ title: "Unsubscribed", description: "Push notifications have been disabled." });
    } catch (e: unknown) {
      toast({ title: "Error", description: errMsg(e), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const endpoint = await getEndpoint();
      await apiRequest("POST", "/api/push/test", { endpoint });
      toast({ title: "Test sent", description: "Check for a test notification on your device." });
    } catch (e: unknown) {
      toast({ title: "Test failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendNow = async () => {
    setIsSendingNow(true);
    try {
      const endpoint = await getEndpoint();
      if (!endpoint) throw new Error("No subscription found");
      const res = await apiRequest("POST", "/api/push/send-now", { endpoint });
      const data = await res.json();
      const sent = data.sent ?? 0;
      toast({
        title: sent > 0 ? "Notifications sent" : "Nothing to send",
        description: sent > 0
          ? `${sent} notification${sent === 1 ? "" : "s"} sent based on your current preferences.`
          : "No enabled notification types had content to send right now.",
      });
    } catch (e: unknown) {
      toast({ title: "Failed to send", description: errMsg(e), variant: "destructive" });
    } finally {
      setIsSendingNow(false);
    }
  };

  const savePrefs = async (newPrefs: Partial<NotificationPrefs>) => {
    const endpoint = await getEndpoint();
    if (!endpoint) return;
    setIsSavingPrefs(true);
    const previous = prefs;
    setPrefs(p => ({ ...p, ...newPrefs }));
    try {
      await apiRequest("POST", "/api/push/preferences", { endpoint, ...newPrefs });
    } catch (e: unknown) {
      toast({ title: "Failed to save", description: errMsg(e), variant: "destructive" });
      setPrefs(previous);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleScheduleModeChange = async (mode: ScheduleMode) => {
    setScheduleMode(mode);
    if (mode === SCHEDULE_MODE_FREQUENCY) await savePrefs({ scheduledTimes: "" });
  };

  const handleAddScheduledTime = async () => {
    if (!newTime) return;
    const existing = prefs.scheduledTimes ? prefs.scheduledTimes.split(",").map(t => t.trim()).filter(Boolean) : [];
    const cleanTime = (t: string) => t.replace(DISABLED_TIME_PREFIX, "");
    if (existing.map(cleanTime).includes(newTime)) {
      toast({ title: "Already added", description: `${formatTime(newTime)} is already in your schedule.` });
      return;
    }
    if (existing.length >= MAX_SCHEDULED_TIMES) {
      toast({ title: "Maximum reached", description: `You can add up to ${MAX_SCHEDULED_TIMES} scheduled times.`, variant: "destructive" });
      return;
    }
    const sorted = [...existing, newTime].sort((a, b) => cleanTime(a).localeCompare(cleanTime(b)));
    await savePrefs({ scheduledTimes: sorted.join(",") });
  };

  const handleRemoveScheduledTime = async (rawEntry: string) => {
    const existing = prefs.scheduledTimes ? prefs.scheduledTimes.split(",").map(t => t.trim()).filter(Boolean) : [];
    const filtered = existing.filter(t => t !== rawEntry);
    await savePrefs({ scheduledTimes: filtered.join(",") });
    if (filtered.length === 0) setScheduleMode(SCHEDULE_MODE_FREQUENCY);
  };

  const handleToggleScheduledTime = async (rawEntry: string) => {
    const existing = prefs.scheduledTimes ? prefs.scheduledTimes.split(",").map(t => t.trim()).filter(Boolean) : [];
    const toggled = existing.map(t => {
      if (t !== rawEntry) return t;
      return rawEntry.startsWith(DISABLED_TIME_PREFIX) ? rawEntry.slice(1) : `${DISABLED_TIME_PREFIX}${rawEntry}`;
    });
    await savePrefs({ scheduledTimes: toggled.join(",") });
  };

  const handleEditCommit = async (rawEntry: string, newValue: string) => {
    setEditingTime(null);
    if (!newValue || newValue === rawEntry.replace(DISABLED_TIME_PREFIX, "")) return;
    const existing = prefs.scheduledTimes ? prefs.scheduledTimes.split(",").map(t => t.trim()).filter(Boolean) : [];
    const cleanTime = (t: string) => t.replace(DISABLED_TIME_PREFIX, "");
    if (existing.filter(t => t !== rawEntry).map(cleanTime).includes(newValue)) {
      toast({ title: "Already added", description: `${formatTime(newValue)} is already in your schedule.` });
      return;
    }
    const wasDisabled = rawEntry.startsWith(DISABLED_TIME_PREFIX);
    const updated = existing.map(t => t === rawEntry ? (wasDisabled ? `${DISABLED_TIME_PREFIX}${newValue}` : newValue) : t);
    const sorted = [...updated].sort((a, b) => cleanTime(a).localeCompare(cleanTime(b)));
    await savePrefs({ scheduledTimes: sorted.join(",") });
  };

  const handleQuietHoursToggle = async (enabled: boolean) => {
    setQuietHoursEnabled(enabled);
    if (!enabled) {
      await savePrefs({ quietHoursStart: null, quietHoursEnd: null });
    } else {
      await savePrefs({
        quietHoursStart: prefs.quietHoursStart ?? "22:00",
        quietHoursEnd: prefs.quietHoursEnd ?? "07:00",
      });
    }
  };

  const allScheduledEntries = prefs.scheduledTimes
    ? prefs.scheduledTimes.split(",").map(t => t.trim()).filter(Boolean).map(raw => ({
        raw,
        time: raw.replace(DISABLED_TIME_PREFIX, ""),
        enabled: !raw.startsWith(DISABLED_TIME_PREFIX),
      }))
    : [];

  const scheduledTimesList = allScheduledEntries.filter(e => e.enabled).map(e => e.time);

  const nextNotificationLabel = (() => {
    if (scheduleMode === SCHEDULE_MODE_SCHEDULED && scheduledTimesList.length > 0) {
      return getNextScheduledTime(prefs.scheduledTimes);
    }
    if (scheduleMode === SCHEDULE_MODE_FREQUENCY) {
      return getNextFrequencyTime(prefs.lastNotifiedAt, prefs.frequencyMinutes);
    }
    return null;
  })();

  const activeCount = [prefs.notifyExtremeWeather, prefs.notifyGeneralWeather, prefs.notifyNewsSummary, prefs.notifyCelebrityDeaths].filter(v => v === 1).length;

  const scheduleDescription = () => {
    if (scheduleMode === SCHEDULE_MODE_SCHEDULED && scheduledTimesList.length > 0) {
      return `at ${scheduledTimesList.map(formatTime).join(", ")}`;
    }
    if (scheduleMode === SCHEDULE_MODE_SCHEDULED && allScheduledEntries.length > 0) {
      return "all times paused — switch to frequency or enable a time";
    }
    return FREQUENCY_OPTIONS.find(f => f.value === String(prefs.frequencyMinutes))?.label.toLowerCase() || `every ${prefs.frequencyMinutes} min`;
  };

  if (status === "unsupported") {
    return (
      <Card data-testid="card-notification-settings">
        <CardHeader className={SETTINGS_CLASSES.header}>
          <BellOff className={SETTINGS_CLASSES.headerIcon} />
          <CardTitle className="text-base">Push Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={TEXT_SM_MUTED} data-testid="text-notification-unsupported">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-notification-settings">
      <CardHeader className={SETTINGS_CLASSES.header}>
        <Bell className={SETTINGS_CLASSES.headerIcon} />
        <CardTitle className="text-base">Push Notifications</CardTitle>
        <div className={SETTINGS_CLASSES.badgeWrap}>
          {status === "subscribed" && <Badge variant="default" data-testid="badge-notification-status">Active</Badge>}
          {status === "unsubscribed" && <Badge variant="secondary" data-testid="badge-notification-status">Off</Badge>}
          {status === "denied" && <Badge variant="destructive" data-testid="badge-notification-status">Blocked</Badge>}
          {status === "loading" && <Badge variant="secondary" data-testid="badge-notification-status">Checking...</Badge>}
        </div>
      </CardHeader>
      <CardContent className={SETTINGS_CLASSES.content}>
        {status !== "subscribed" && (
          <p className={TEXT_SM_MUTED}>
            {status === "denied"
              ? "Notification permission was blocked. Please enable it in your browser settings."
              : "Get automatic alerts for adverse weather, general weather updates, and local news summaries delivered straight to your device."}
          </p>
        )}

        {status === "subscribed" && (
          <div className={SETTINGS_CLASSES.descBlock}>
            <p className={TEXT_SM_MUTED}>
              {activeCount} content {activeCount === 1 ? "type" : "types"} enabled, delivered {scheduleDescription()}.
            </p>
            {nextNotificationLabel && (
              <p className={SETTINGS_CLASSES.nextLabel}>
                <Clock className={SETTINGS_CLASSES.clockIcon} />
                Next notification {nextNotificationLabel}
                {quietHoursEnabled && prefs.quietHoursStart && prefs.quietHoursEnd && (
                  <span className={SETTINGS_CLASSES.quietPill}>
                    · quiet {formatTime(prefs.quietHoursStart)}–{formatTime(prefs.quietHoursEnd)}
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        <div className={SETTINGS_CLASSES.buttonRow}>
          {status === "subscribed" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrefs(!showPrefs)}
                data-testid="button-toggle-prefs"
              >
                <Settings className={SETTINGS_CLASSES.btnIcon} />
                Customise
                {showPrefs ? <ChevronUp className={SETTINGS_CLASSES.chevronIcon} /> : <ChevronDown className={SETTINGS_CLASSES.chevronIcon} />}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSendNow}
                disabled={isSendingNow || activeCount === 0}
                data-testid="button-send-now"
              >
                <Zap className={SETTINGS_CLASSES.btnIcon} />
                {isSendingNow ? "Sending..." : "Send Now"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isTesting}
                data-testid="button-test-notification"
              >
                <Send className={SETTINGS_CLASSES.btnIcon} />
                {isTesting ? "Sending..." : "Test"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnsubscribe}
                disabled={isProcessing}
                data-testid="button-unsubscribe"
              >
                <BellOff className={SETTINGS_CLASSES.btnIcon} />
                {isProcessing ? "Disabling..." : "Disable"}
              </Button>
            </>
          ) : status !== "denied" && status !== "loading" ? (
            <Button onClick={handleSubscribe} disabled={isProcessing} data-testid="button-subscribe">
              <BellRing className={SETTINGS_CLASSES.btnIcon} />
              {isProcessing ? "Enabling..." : "Enable Notifications"}
            </Button>
          ) : null}
        </div>

        {status === "subscribed" && showPrefs && (
          <NotificationPrefsPanel
            prefs={prefs}
            scheduleMode={scheduleMode}
            newTime={newTime}
            editingTime={editingTime}
            quietHoursEnabled={quietHoursEnabled}
            isSavingPrefs={isSavingPrefs}
            allScheduledEntries={allScheduledEntries}
            onSavePrefs={savePrefs}
            onScheduleModeChange={handleScheduleModeChange}
            onNewTimeChange={setNewTime}
            onAddScheduledTime={handleAddScheduledTime}
            onRemoveScheduledTime={handleRemoveScheduledTime}
            onToggleScheduledTime={handleToggleScheduledTime}
            onEditingTimeChange={setEditingTime}
            onEditCommit={handleEditCommit}
            onQuietHoursToggle={handleQuietHoursToggle}
          />
        )}
      </CardContent>
    </Card>
  );
}
