const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Whole paise to "₹200" or "₹38.50". */
export function formatRupees(paise: number): string {
  return rupees.format(paise / 100);
}

/** "200" or "38.50" rupees typed by staff to whole paise; NaN if it isn't an amount. Negatives pass through for the API to reject. */
export function rupeesToPaise(rupees: string): number {
  const trimmed = rupees.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return Number.NaN;
  return Math.round(Number(trimmed) * 100);
}

/** Whole paise to "200" or "38.5" for an editable rupee field. */
export function paiseToRupees(paise: number): string {
  return String(paise / 100);
}

/** "08:00" to "8 AM", "20:30" to "8:30 PM". */
export function formatClockTime(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const hour = hours % 12 || 12;
  return minutes ? `${hour}:${String(minutes).padStart(2, "0")} ${period}` : `${hour} ${period}`;
}

/** "Opens 8 AM" when the next opening is today in the shop timezone, else "Opens tomorrow 8 AM". */
export function formatNextOpening(nextOpeningAt: string, timeZone: string, now: Date = new Date()): string {
  return `Opens ${formatOpeningTime(nextOpeningAt, timeZone, now)}`;
}

/** "8 AM" when the opening is today in the shop timezone, else "tomorrow 8 AM". */
export function formatOpeningTime(openingAt: string, timeZone: string, now: Date = new Date()): string {
  const opening = new Date(openingAt);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" });
  const when = formatClockTime(clockTime(opening, timeZone));
  return day.format(opening) === day.format(now) ? when : `tomorrow ${when}`;
}

/** "10:42 AM" in the shop timezone. */
export function formatTimeOfDay(at: string, timeZone: string): string {
  const [hours, minutes] = clockTime(new Date(at), timeZone).split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

/** "Placed today, 10:42 AM" or "Placed 2 Nov, 10:42 AM", in the shop timezone. */
export function formatPlacedAt(at: string, timeZone: string, now: Date = new Date()): string {
  return `Placed ${formatDayAndTime(at, timeZone, now)}`;
}

/** "today, 10:42 AM" or "2 Nov, 10:42 AM", in the shop timezone. */
export function formatDayAndTime(at: string, timeZone: string, now: Date = new Date()): string {
  const moment = new Date(at);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" });
  const date = new Intl.DateTimeFormat("en-IN", { timeZone, day: "numeric", month: "short" });
  const when = day.format(moment) === day.format(now) ? "today" : date.format(moment);
  return `${when}, ${formatTimeOfDay(at, timeZone)}`;
}

function clockTime(moment: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(moment);
}

/** A 10-digit mobile number as "98450 12345". */
export function formatPhone(phone: string): string {
  return `${phone.slice(0, 5)} ${phone.slice(5)}`;
}
