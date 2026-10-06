export function validMinute(value) { return Number.isInteger(value) && value >= 0 && value < 1440; }
export function quietAt(minute, start, end) {
  return start === end ? false : start < end ? minute >= start && minute < end : minute >= start || minute < end;
}
export function clockFormatter(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}
export function localClock(date, formatter) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}
// Walking real minutes correctly handles skipped/repeated clock times and DST.
// Called on registration and once per device/day, not on every scheduler tick.
export function nextQuoteDate(now, minute, timeZone) {
  const formatter = clockFormatter(timeZone);
  const start = Math.floor(now.getTime() / 60_000) * 60_000 + 60_000;
  for (let offset = 0; offset < 50 * 60; offset++) {
    const date = new Date(start + offset * 60_000);
    if (localClock(date, formatter).minute === minute) return date;
  }
  throw new Error('Could not calculate the next quote time');
}
export function eligibleQuote(data) {
  return data.active === true && typeof data.text === 'string' && data.text.trim().length > 0 && data.text.length <= 500;
}
export function pickQuote(quotes, recentIds = [], random = Math.random) {
  if (!quotes.length) return null;
  const fresh = quotes.filter((quote) => !recentIds.includes(quote.id));
  const withoutLast = quotes.filter((quote) => quote.id !== recentIds.at(-1));
  const pool = fresh.length ? fresh : withoutLast.length ? withoutLast : quotes;
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
}
export function quoteBody(quote) {
  const author = typeof quote.author === 'string' ? quote.author.trim().slice(0, 80) : '';
  return `${quote.text.trim()}${author ? ` — ${author}` : ''}`;
}
