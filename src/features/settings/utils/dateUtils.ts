/**
 * Returns the local date string in YYYY-MM-DD format.
 * This avoids timezone issues where toISOString() returns the UTC date
 * which might be different from the user's local date.
 */
export function getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
