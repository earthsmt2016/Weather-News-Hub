import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GeocodeResult } from "@shared/schema";
import { CurrentWeather } from "@/components/current-weather";
import { ThreeHourForecast } from "@/components/three-hour-forecast";
import { HourlyBreakdown } from "@/components/hourly-breakdown";
import { SevenDayForecast } from "@/components/seven-day-forecast";
import { AirQualityCard } from "@/components/air-quality";
import { LocationSearch } from "@/components/location-search";
import { MapPicker } from "@/components/map-picker";
import { WeatherAlerts } from "@/components/weather-alerts";
import { WeatherRadar } from "@/components/weather-radar";
import { NotificationSettings } from "@/components/notification-settings";
import { NewsFeed, SavedFeed } from "@/components/news-feed";
import { DeathCard } from "@/components/death-card";
import { useSavedArticles } from "@/hooks/use-saved-articles";
import { useDashboardData, type LocationState } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/lib/auth-context";
import { WeatherSkeleton } from "@/components/weather-skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CloudSun,
  Newspaper,
  RefreshCw,
  AlertCircle,
  MapPin,
  Clock,
  Share2,
  Map,
  Navigation,
  Heart,
  Star,
  Trash2,
  Lock,
  LogOut,
} from "lucide-react";
import { detectWeatherAlerts } from "@/lib/weather-utils";
import { MUTED_LABEL, EMPTY_STATE, TEXT_SM_MUTED } from "@/lib/styles";
import {
  TAB_WEATHER,
  TAB_NEWS,
  TAB_DEATHS,
  SUB_TAB_LATEST,
  SUB_TAB_SAVED,
  FALLBACK_LOCATION_NAME,
  FALLBACK_LAT,
  FALLBACK_LON,
  FALLBACK_REGION,
  FALLBACK_COUNTRY,
} from "@/lib/constants";

const SUB_TAB_CLASSES = {
  base:      "text-sm font-medium pb-1 border-b-2 transition-colors",
  savedBase: "flex items-center gap-1.5 text-sm font-medium pb-1 border-b-2 transition-colors",
  active:    "border-foreground text-foreground",
  inactive:  "border-transparent text-muted-foreground hover:text-foreground",
} as const;

const DASH_CLASSES = {
  // Page layout
  page:           "min-h-screen bg-background",
  header:         "sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
  headerInner:    "max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3",
  headerRow:      "flex items-center justify-between gap-3 flex-wrap",
  headerLeft:     "flex items-center gap-3",
  appIcon:        "w-6 h-6 text-foreground",
  appTitle:       "text-base font-semibold leading-tight",
  headerRight:    "flex items-center gap-2",
  lastUpdated:    `hidden sm:flex items-center gap-1 ${MUTED_LABEL}`,
  iconXs:         "w-3 h-3",
  regionBadge:    "hidden sm:flex",
  regionBadgeIcon: "w-3 h-3 mr-1",
  navBtnIcon:     "w-4 h-4 mr-1",
  refreshBase:    "w-4 h-4",
  logoutBtn:      "gap-1.5 text-xs",
  logoutIcon:     "w-3.5 h-3.5",
  // Search row
  searchRow:      "flex items-center gap-2",
  // Login dialog
  loginForm:      "flex flex-col gap-4 mt-2",
  formField:      "flex flex-col gap-1.5",
  loginError:     "text-sm text-destructive",
  // Main content
  main:           "max-w-6xl mx-auto px-4 py-6",
  mapWrap:        "mb-6",
  tabIcon:        "w-4 h-4 mr-1.5",
  weatherContent: "flex flex-col gap-4",
  errorIcon:      "w-10 h-10 text-destructive",
  // Sub-tab header
  subTabHeader:   "flex items-center justify-between gap-3 mb-4 flex-wrap",
  subTabGroup:    "flex items-center gap-3",
  countBadge:     "text-[10px] h-4 px-1.5 min-w-4",
  iconSm:         "w-3.5 h-3.5",
  regionLabel:    `${MUTED_LABEL} hidden sm:block`,
  // Deaths loading skeleton
  deathsList:     "flex flex-col gap-3",
  skeletonInner:  "flex flex-col gap-2",
  skeletonLine1:  "h-4 bg-muted animate-pulse rounded w-3/4",
  skeletonLine2:  "h-3 bg-muted animate-pulse rounded w-full",
  skeletonLine3:  "h-3 bg-muted animate-pulse rounded w-1/2",
  // Empty states
  emptyIcon:        "w-10 h-10 text-muted-foreground",
  emptyTitle:       "font-medium",
  savedEmptyTitle:  "text-base font-medium text-muted-foreground",
  emptyBody:        TEXT_SM_MUTED,
  emptyBodySm:      `${TEXT_SM_MUTED} max-w-xs`,
  // Saved deaths header
  savedHeader:    "flex items-center justify-between",
  savedCount:     TEXT_SM_MUTED,
  clearBtn:       "text-muted-foreground hover:text-destructive",
  trashIcon:      "w-3.5 h-3.5 mr-1",
  // Footer
  footer:         "border-t mt-12",
  footerInner:    "max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap",
} as const;

const FALLBACK_LOCATION: LocationState = {
  name:    FALLBACK_LOCATION_NAME,
  lat:     FALLBACK_LAT,
  lon:     FALLBACK_LON,
  region:  FALLBACK_REGION,
  country: FALLBACK_COUNTRY,
};

function formatLastUpdated(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function Dashboard() {
  const [location, setLocation] = useState(FALLBACK_LOCATION);
  const [homeLocation, setHomeLocation] = useState(FALLBACK_LOCATION);
  const [geolocating, setGeolocating] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const [newsTab, setNewsTab] = useState<typeof SUB_TAB_LATEST | typeof SUB_TAB_SAVED>(SUB_TAB_LATEST);
  const [deathsTab, setDeathsTab] = useState<typeof SUB_TAB_LATEST | typeof SUB_TAB_SAVED>(SUB_TAB_LATEST);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const geoAttempted = useRef(false);
  const { isLoggedIn, login, logout, user } = useAuth();
  const { toast } = useToast();
  const { favourites, isFavourite, toggleFavourite, removeFavourite } = useSavedArticles();

  const savedNewsArticles  = favourites.filter(a => !a.deathSubject);
  const savedDeathArticles = favourites.filter(a => !!a.deathSubject);
  const clearDeathFavourites = () => savedDeathArticles.forEach(a => removeFavourite(a.link));

  useEffect(() => {
    if (!isLoggedIn) {
      setNewsTab(SUB_TAB_LATEST);
      setDeathsTab(SUB_TAB_LATEST);
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginPending(true);
    try {
      await login(loginUsername, loginPassword);
      setLoginOpen(false);
      setLoginUsername("");
      setLoginPassword("");
      toast({ title: "Logged in", description: `Welcome back, ${loginUsername}` });
    } catch {
      setLoginError("Invalid username or password.");
    } finally {
      setLoginPending(false);
    }
  };

  useEffect(() => {
    if (geoAttempted.current) return;
    geoAttempted.current = true;

    if (!navigator.geolocation) {
      setGeolocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const detected = {
              name: data.name || "Your Location",
              lat: latitude,
              lon: longitude,
              region: data.region || "",
              country: data.country || "",
            };
            setLocation(detected);
            setHomeLocation(detected);
          }
        } catch {
        }
        setGeolocating(false);
      },
      () => {
        setGeolocating(false);
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  const isCustomLocation = location.name !== homeLocation.name;

  const {
    weather, weatherLoading, weatherError, weatherErrorData,
    news, newsLoading, newsError,
    airQuality,
    deathsData, deathsLoading, deathsError,
    isRefreshing, handleRefresh,
  } = useDashboardData(location, !geolocating);

  const handleLocationSelect = useCallback((result: GeocodeResult) => {
    setLocation({
      name: result.name,
      lat: result.latitude,
      lon: result.longitude,
      region: result.region || result.country,
      country: result.country || "",
    });
  }, []);

  const handleLocationReset = useCallback(() => {
    setLocation(homeLocation);
  }, [homeLocation]);

  const handleShare = async () => {
    const text = weather
      ? `Weather in ${location.name}: ${Math.round(weather.current.temperature)}°C, ${weather.current.humidity}% humidity, Wind ${Math.round(weather.current.windSpeed)} km/h`
      : `Check the weather in ${location.name}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${location.name} Weather`, text, url: window.location.href });
      } catch (e) {
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
    }
  };

  return (
    <div className={DASH_CLASSES.page}>
      <header className={DASH_CLASSES.header}>
        <div className={DASH_CLASSES.headerInner}>
          <div className={DASH_CLASSES.headerRow}>
            <div className={DASH_CLASSES.headerLeft}>
              <CloudSun className={DASH_CLASSES.appIcon} />
              <div>
                <h1 className={DASH_CLASSES.appTitle} data-testid="text-app-title">
                  {location.name}
                </h1>
                <p className={MUTED_LABEL}>
                  Weather & Local News
                </p>
              </div>
              {isCustomLocation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLocationReset}
                  data-testid="button-back-to-home"
                >
                  <Navigation className={DASH_CLASSES.navBtnIcon} />
                  {homeLocation.name.length > 20 ? homeLocation.name.slice(0, 18) + "..." : homeLocation.name}
                </Button>
              )}
            </div>
            <div className={DASH_CLASSES.headerRight}>
              {weather?.lastUpdated && (
                <span className={DASH_CLASSES.lastUpdated} data-testid="text-last-updated">
                  <Clock className={DASH_CLASSES.iconXs} />
                  Updated {formatLastUpdated(weather.lastUpdated)}
                </span>
              )}
              {location.region && (
                <Badge variant="outline" className={DASH_CLASSES.regionBadge}>
                  <MapPin className={DASH_CLASSES.regionBadgeIcon} />
                  {location.region.split(",")[0].trim()}
                </Badge>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleShare}
                data-testid="button-share"
              >
                <Share2 className={DASH_CLASSES.refreshBase} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                data-testid="button-refresh"
              >
                <RefreshCw className={`${DASH_CLASSES.refreshBase} ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              {isLoggedIn ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { logout(); toast({ title: "Logged out" }); }}
                  data-testid="button-logout"
                  className={DASH_CLASSES.logoutBtn}
                >
                  <LogOut className={DASH_CLASSES.logoutIcon} />
                  <span className="hidden sm:inline">{user?.username}</span>
                  <span className="sm:hidden">Log out</span>
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLoginOpen(true)}
                  data-testid="button-login"
                  title="Admin login"
                >
                  <Lock className={DASH_CLASSES.refreshBase} />
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
          <div className={DASH_CLASSES.searchRow}>
            <div className="flex-1">
              <LocationSearch
                currentLocation={location.name}
                onLocationSelect={handleLocationSelect}
                onReset={handleLocationReset}
              />
            </div>
            <Button
              size="icon"
              variant={mapOpen ? "default" : "outline"}
              onClick={() => setMapOpen(!mapOpen)}
              data-testid="button-toggle-map"
            >
              <Map className={DASH_CLASSES.refreshBase} />
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={loginOpen} onOpenChange={(open) => { setLoginOpen(open); if (!open) { setLoginError(""); setLoginUsername(""); setLoginPassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Admin Login</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogin} className={DASH_CLASSES.loginForm}>
            <div className={DASH_CLASSES.formField}>
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                autoComplete="username"
                data-testid="input-login-username"
              />
            </div>
            <div className={DASH_CLASSES.formField}>
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                data-testid="input-login-password"
              />
            </div>
            {loginError && (
              <p className={DASH_CLASSES.loginError} data-testid="text-login-error">{loginError}</p>
            )}
            <Button type="submit" disabled={loginPending} data-testid="button-login-submit">
              {loginPending ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <main className={DASH_CLASSES.main}>
        {mapOpen && (
          <div className={DASH_CLASSES.mapWrap}>
            <MapPicker
              currentLat={location.lat}
              currentLon={location.lon}
              onLocationSelect={(loc) => {
                setLocation({
                  name: loc.name,
                  lat: loc.lat,
                  lon: loc.lon,
                  region: loc.region,
                  country: loc.country,
                });
              }}
              isOpen={mapOpen}
              onClose={() => setMapOpen(false)}
            />
          </div>
        )}

        <Tabs defaultValue={TAB_WEATHER} className="w-full">
          <TabsList className="mb-6" data-testid="tabs-main">
            <TabsTrigger value={TAB_WEATHER} data-testid="tab-weather">
              <CloudSun className={DASH_CLASSES.tabIcon} />
              Weather
            </TabsTrigger>
            <TabsTrigger value={TAB_NEWS} data-testid="tab-news">
              <Newspaper className={DASH_CLASSES.tabIcon} />
              Local News
            </TabsTrigger>
            <TabsTrigger value={TAB_DEATHS} data-testid="tab-deaths">
              <Star className={DASH_CLASSES.tabIcon} />
              Celebrity Deaths
            </TabsTrigger>
          </TabsList>

          <TabsContent value={TAB_WEATHER}>
            {weatherError && (
              <Card className={EMPTY_STATE}>
                <AlertCircle className={DASH_CLASSES.errorIcon} />
                <h3 className={DASH_CLASSES.emptyTitle}>Unable to load weather</h3>
                <p className={DASH_CLASSES.emptyBody}>
                  {weatherErrorData?.message || "Please try again in a moment."}
                </p>
                <Button variant="outline" onClick={handleRefresh} data-testid="button-retry-weather">
                  <RefreshCw className={DASH_CLASSES.tabIcon} />
                  Retry
                </Button>
              </Card>
            )}

            {(weatherLoading || geolocating) && <WeatherSkeleton />}

            {weather && (
              <div className={DASH_CLASSES.weatherContent}>
                <WeatherAlerts alerts={detectWeatherAlerts(weather.current, weather.daily)} />
                <CurrentWeather forecast={weather} />
                {airQuality && <AirQualityCard data={airQuality} />}
                <ThreeHourForecast forecast={weather.threeHourly} />
                <HourlyBreakdown hourly={weather.hourly} />
                <SevenDayForecast daily={weather.daily} hourly={weather.hourly} />
                <WeatherRadar latitude={location.lat} longitude={location.lon} locationName={location.name} />
                <NotificationSettings />
              </div>
            )}
          </TabsContent>

          <TabsContent value={TAB_NEWS}>
            <div className={DASH_CLASSES.subTabHeader}>
              <div className={DASH_CLASSES.subTabGroup}>
                <button
                  className={`${SUB_TAB_CLASSES.base} ${newsTab === SUB_TAB_LATEST ? SUB_TAB_CLASSES.active : SUB_TAB_CLASSES.inactive}`}
                  onClick={() => setNewsTab(SUB_TAB_LATEST)}
                  data-testid="tab-news-latest"
                >
                  Latest
                </button>
                {isLoggedIn && (
                  <button
                    className={`${SUB_TAB_CLASSES.savedBase} ${newsTab === SUB_TAB_SAVED ? SUB_TAB_CLASSES.active : SUB_TAB_CLASSES.inactive}`}
                    onClick={() => setNewsTab(SUB_TAB_SAVED)}
                    data-testid="tab-news-saved"
                  >
                    <Heart className={DASH_CLASSES.iconSm} />
                    Saved
                    {savedNewsArticles.length > 0 && (
                      <Badge variant="secondary" className={DASH_CLASSES.countBadge}>
                        {savedNewsArticles.length}
                      </Badge>
                    )}
                  </button>
                )}
              </div>
              {newsTab === SUB_TAB_LATEST && news && (
                <span className={MUTED_LABEL}>
                  Updated {new Date(news.lastUpdated).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {newsTab === SUB_TAB_LATEST && news?.regionLabel && (
                <span className={DASH_CLASSES.regionLabel}>
                  {news.regionLabel}
                </span>
              )}
            </div>

            {newsTab === SUB_TAB_LATEST && (
              <>
                {newsError && (
                  <Card className={EMPTY_STATE}>
                    <AlertCircle className={DASH_CLASSES.errorIcon} />
                    <h3 className={DASH_CLASSES.emptyTitle}>Unable to load news</h3>
                    <p className={DASH_CLASSES.emptyBody}>
                      Please try again in a moment.
                    </p>
                    <Button variant="outline" onClick={handleRefresh} data-testid="button-retry-news">
                      <RefreshCw className={DASH_CLASSES.tabIcon} />
                      Retry
                    </Button>
                  </Card>
                )}
                <NewsFeed
                  articles={news?.articles || []}
                  isLoading={newsLoading || geolocating}
                  isFavourite={isLoggedIn ? isFavourite : undefined}
                  onToggleFavourite={isLoggedIn ? toggleFavourite : undefined}
                />
              </>
            )}

            {newsTab === SUB_TAB_SAVED && (
              <SavedFeed
                articles={savedNewsArticles}
                onRemove={removeFavourite}
                onClearAll={() => savedNewsArticles.forEach(a => removeFavourite(a.link))}
              />
            )}
          </TabsContent>

          <TabsContent value={TAB_DEATHS}>
            <div className={DASH_CLASSES.subTabHeader}>
              <div className={DASH_CLASSES.subTabGroup}>
                <button
                  className={`${SUB_TAB_CLASSES.base} ${deathsTab === SUB_TAB_LATEST ? SUB_TAB_CLASSES.active : SUB_TAB_CLASSES.inactive}`}
                  onClick={() => setDeathsTab(SUB_TAB_LATEST)}
                  data-testid="tab-deaths-latest"
                >
                  Latest
                </button>
                {isLoggedIn && (
                  <button
                    className={`${SUB_TAB_CLASSES.savedBase} ${deathsTab === SUB_TAB_SAVED ? SUB_TAB_CLASSES.active : SUB_TAB_CLASSES.inactive}`}
                    onClick={() => setDeathsTab(SUB_TAB_SAVED)}
                    data-testid="tab-deaths-saved"
                  >
                    <Heart className={DASH_CLASSES.iconSm} />
                    Saved
                    {savedDeathArticles.length > 0 && (
                      <Badge variant="secondary" className={DASH_CLASSES.countBadge}>
                        {savedDeathArticles.length}
                      </Badge>
                    )}
                  </button>
                )}
              </div>
              {deathsTab === SUB_TAB_LATEST && deathsData && (
                <span className={MUTED_LABEL}>
                  Updated {new Date(deathsData.lastUpdated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            {deathsTab === SUB_TAB_LATEST && (
              <div className={DASH_CLASSES.weatherContent}>
                {deathsError && (
                  <Card className={EMPTY_STATE}>
                    <AlertCircle className={DASH_CLASSES.errorIcon} />
                    <h3 className={DASH_CLASSES.emptyTitle}>Unable to load celebrity deaths</h3>
                    <p className={DASH_CLASSES.emptyBody}>Please try again in a moment.</p>
                  </Card>
                )}
                {deathsLoading && (
                  <div className={DASH_CLASSES.deathsList}>
                    {[1, 2, 3, 4].map(i => (
                      <Card key={i} className="p-4">
                        <div className={DASH_CLASSES.skeletonInner}>
                          <div className={DASH_CLASSES.skeletonLine1} />
                          <div className={DASH_CLASSES.skeletonLine2} />
                          <div className={DASH_CLASSES.skeletonLine3} />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {!deathsLoading && !deathsError && (!deathsData?.articles || deathsData.articles.length === 0) && (
                  <Card className={EMPTY_STATE}>
                    <Star className={DASH_CLASSES.emptyIcon} />
                    <h3 className={DASH_CLASSES.emptyTitle}>No recent celebrity deaths</h3>
                    <p className={DASH_CLASSES.emptyBody}>No notable celebrity deaths reported in the last 3 days.</p>
                  </Card>
                )}
                {!deathsLoading && deathsData?.articles && deathsData.articles.length > 0 && (
                  <div className={DASH_CLASSES.deathsList}>
                    {deathsData.articles.map((article, index) => (
                      <DeathCard
                        key={article.link || index}
                        article={article}
                        index={index}
                        isFavourite={isLoggedIn ? isFavourite : undefined}
                        onToggleFavourite={isLoggedIn ? toggleFavourite : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {deathsTab === SUB_TAB_SAVED && (
              savedDeathArticles.length === 0 ? (
                <Card className={EMPTY_STATE}>
                  <Heart className={DASH_CLASSES.emptyIcon} />
                  <p className={DASH_CLASSES.savedEmptyTitle}>No saved articles yet</p>
                  <p className={DASH_CLASSES.emptyBodySm}>
                    Tap the heart icon on any celebrity death article to save it here.
                  </p>
                </Card>
              ) : (
                <div className={DASH_CLASSES.deathsList}>
                  <div className={DASH_CLASSES.savedHeader}>
                    <p className={DASH_CLASSES.savedCount}>
                      {savedDeathArticles.length} saved {savedDeathArticles.length === 1 ? "article" : "articles"}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={DASH_CLASSES.clearBtn}
                      onClick={clearDeathFavourites}
                      data-testid="button-clear-all-death-saved"
                    >
                      <Trash2 className={DASH_CLASSES.trashIcon} />
                      Clear all
                    </Button>
                  </div>
                  {savedDeathArticles.map((article, index) => (
                    <DeathCard
                      key={article.link || index}
                      article={article}
                      index={index}
                      isFavourite={isFavourite}
                      onToggleFavourite={toggleFavourite}
                      savedAt={article.savedAt}
                      onRemove={removeFavourite}
                    />
                  ))}
                </div>
              )
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className={DASH_CLASSES.footer}>
        <div className={DASH_CLASSES.footerInner}>
          <p className={MUTED_LABEL}>
            Weather & air quality data from Open-Meteo
          </p>
          <p className={MUTED_LABEL}>
            News from Google News & regional sources
          </p>
        </div>
      </footer>
    </div>
  );
}
