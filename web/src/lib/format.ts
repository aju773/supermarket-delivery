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

/** "08:00" to "8 AM", "20:30" to "8:30 PM". */
export function formatClockTime(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const hour = hours % 12 || 12;
  return minutes ? `${hour}:${String(minutes).padStart(2, "0")} ${period}` : `${hour} ${period}`;
}

/** "Opens 8 AM" when the next opening is today in the shop timezone, else "Opens tomorrow 8 AM". */
export function formatNextOpening(nextOpeningAt: string, timeZone: string, now: Date = new Date()): string {
  const opening = new Date(nextOpeningAt);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" });
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
  const when = formatClockTime(clock.format(opening));
  return day.format(opening) === day.format(now) ? `Opens ${when}` : `Opens tomorrow ${when}`;
}
