// Shared TypeScript types used across multiple components.
// Values (SCHEDULE_MODE_*) live in constants.ts; this file is types only.

import { SCHEDULE_MODE_FREQUENCY, SCHEDULE_MODE_SCHEDULED } from "./constants";

/** Notification delivery mode — frequency-based or fixed scheduled times. */
export type ScheduleMode = typeof SCHEDULE_MODE_FREQUENCY | typeof SCHEDULE_MODE_SCHEDULED;
