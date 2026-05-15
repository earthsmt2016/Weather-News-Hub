// Theme
export const THEME_LIGHT       = "light" as const;
export const THEME_DARK        = "dark"  as const;
export const THEME_STORAGE_KEY = "theme";
export const THEME_DOM_CLASS   = "dark";

// Storage keys
export const FAVOURITES_STORAGE_KEY = "weather-app-favourites";

// Auth
export const ADMIN_USER_ID = "admin";

// Notification schedule mode values
export const SCHEDULE_MODE_FREQUENCY = "frequency" as const;
export const SCHEDULE_MODE_SCHEDULED = "scheduled" as const;

// Main tab values (Shadcn Tabs)
export const TAB_WEATHER = "weather";
export const TAB_NEWS    = "news";
export const TAB_DEATHS  = "deaths";

// Sub-tab values
export const SUB_TAB_LATEST = "latest";
export const SUB_TAB_SAVED  = "saved";

// Limits
export const MAX_FAVOURITES = 200;

// Search
export const SEARCH_DEBOUNCE_MS = 300;

// Notification prefs — booleans stored as integers in DB
export const PREF_ENABLED  = 1;
export const PREF_DISABLED = 0;

// Notification defaults
export const DEFAULT_FREQUENCY_MINUTES   = 30;
export const DEFAULT_NEWS_ARTICLE_COUNT  = 3;
export const MAX_SCHEDULED_TIMES         = 6;

// Radar
export const RADAR_DEFAULT_ZOOM = 8;

// Time arithmetic
export const MINS_PER_HOUR   = 60;
export const HOURS_PER_DAY   = 24;
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINS_PER_HOUR; // 1440
export const MS_PER_MINUTE   = 60_000;

// AQI band upper bounds (European AQI scale)
export const AQI_GOOD_MAX     = 20;
export const AQI_FAIR_MAX     = 40;
export const AQI_MODERATE_MAX = 60;
export const AQI_POOR_MAX     = 80;

// Default (fallback) location — Birmingham & Solihull
export const FALLBACK_LOCATION_NAME    = "Birmingham & Solihull";
export const FALLBACK_LAT              = 52.4862;
export const FALLBACK_LON              = -1.8904;
export const FALLBACK_REGION           = "West Midlands";
export const FALLBACK_COUNTRY          = "United Kingdom";

// Date parsing — append to a YYYY-MM-DD string to avoid timezone date-shift
export const DATE_MIDDAY_SUFFIX = "T12:00:00";

// Weather icon day/night flag values used by Open-Meteo
export const WEATHER_IS_DAY   = 1;
export const WEATHER_IS_NIGHT = 0;

// Clock — hour at which AM flips to PM (used for 12h display formatting)
export const NOON_HOUR = 12;
