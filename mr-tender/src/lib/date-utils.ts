/**
 * Date and Time Utilities for Colombia (America/Bogota, UTC-5)
 * Centralizes date formatting, range calculations, and UTC boundary conversions.
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota'
export const COLOMBIA_UTC_OFFSET_HOURS = -5

/**
 * Returns a 'YYYY-MM-DD' string representing the calendar date in Colombia (America/Bogota).
 * @param input Date object, ISO string, timestamp number, or undefined/null (defaults to now)
 */
export function getColombiaDateString(input?: Date | string | number | null): string {
  if (!input) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: COLOMBIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())
  }

  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input
  if (isNaN(d.getTime())) {
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input
    }
    return ''
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d)
}

/**
 * Returns a 'HH:mm:ss-05:00' string representing the time in Colombia (America/Bogota).
 * Strictly compliant with DIAN Electronic Invoicing requirements (Resolution 000042 & Technical Annex 1.9).
 * @param input Date object, ISO string, timestamp number, or undefined (defaults to now)
 */
export function getColombiaTimeString(input?: Date | string | number | null): string {
  const d = input ? (typeof input === 'string' || typeof input === 'number' ? new Date(input) : input) : new Date()
  const validDate = isNaN(d.getTime()) ? new Date() : d

  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: COLOMBIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(validDate)

  return `${timeStr}-05:00`
}

/**
 * Returns UTC ISO strings { gte, lte } for the entire Colombia calendar day (00:00:00.000 to 23:59:59.999 UTC-5).
 * In UTC, a day in Colombia starts at 05:00:00.000Z of that day and ends at 04:59:59.999Z of the next day.
 * @param colombiaDateStr 'YYYY-MM-DD' (defaults to current Colombia day)
 */
export function getColombiaDayBoundsUTC(colombiaDateStr?: string): { gte: string; lte: string } {
  const targetDateStr = colombiaDateStr || getColombiaDateString()
  const [yearStr, monthStr, dayStr] = targetDateStr.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1
  const day = parseInt(dayStr, 10)

  // Start of day in UTC: YYYY-MM-DD 05:00:00.000Z
  const startUtc = new Date(Date.UTC(year, month, day, 5, 0, 0, 0))
  // End of day in UTC: (YYYY-MM-(DD+1)) 04:59:59.999Z
  const endUtc = new Date(Date.UTC(year, month, day + 1, 4, 59, 59, 999))

  return {
    gte: startUtc.toISOString(),
    lte: endUtc.toISOString()
  }
}

/**
 * Returns 'YYYY-MM-DD' in Colombia time shifted by a relative number of days.
 * @param daysOffset positive for future days, negative for past days (e.g. -7 for 7 days ago)
 * @param baseDate base date (defaults to current Colombia time)
 */
export function getColombiaRelativeDateString(daysOffset: number, baseDate?: Date | string): string {
  const base = baseDate ? (typeof baseDate === 'string' ? new Date(baseDate) : baseDate) : new Date()
  const target = new Date(base.getTime() + daysOffset * 24 * 60 * 60 * 1000)
  return getColombiaDateString(target)
}

/**
 * Checks if a given timestamp falls within a date range [start, end] evaluated in Colombia calendar days.
 * @param isoString The timestamp from DB / API
 * @param start 'YYYY-MM-DD' (inclusive)
 * @param end 'YYYY-MM-DD' (inclusive)
 */
export function isDateInRangeColombia(
  isoString?: string | null,
  start?: string,
  end?: string
): boolean {
  if (!isoString) return true
  const itemDate = getColombiaDateString(isoString)
  if (!itemDate) return true
  if (start && itemDate < start) return false
  if (end && itemDate > end) return false
  return true
}

/**
 * Formats an ISO string or Date into a human-readable string in Colombia time.
 */
export function formatColombiaDateTime(
  input: string | Date | null | undefined,
  includeTime = true
): string {
  if (!input) return ''
  const d = typeof input === 'string' ? new Date(input) : input
  if (isNaN(d.getTime())) return ''

  const options: Intl.DateTimeFormatOptions = {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true } : {})
  }

  return new Intl.DateTimeFormat('es-CO', options).format(d)
}
