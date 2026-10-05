const isValid = (d) => d instanceof Date && !isNaN(d);

const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();


export function formatEventDate(
    startValue,
    endValue,
    { timeKnown = true, month = "2-digit", locale = "sr-BA" } = {}
) {
    if (!startValue) return "";

    const start = new Date(startValue);
    if (!isValid(start)) return String(startValue);

    const dayFormat = { day: "2-digit", month, year: "numeric" };
    const timeFormat = { hour: "2-digit", minute: "2-digit" };

    const end = endValue ? new Date(endValue) : null;
    const hasRange = isValid(end) && end > start && !sameDay(start, end);

    if (hasRange) {
        return `${start.toLocaleDateString(locale, dayFormat)} – ${end.toLocaleDateString(locale, dayFormat)}`;
    }

    const dateText = start.toLocaleDateString(locale, dayFormat);

    return timeKnown
        ? `${dateText} ${start.toLocaleTimeString(locale, timeFormat)}`
        : dateText;
}

/** Vrijeme kada dogadjaj zavrsava: end_date, inace start_date (kraj dana ako vrijeme nije poznato). */
export function getEventEnd(event) {
    const end = event.end_date ? new Date(event.end_date) : null;
    if (isValid(end)) return end;

    const start = new Date(event.start_date);
    if (!isValid(start)) return null;

    if (event.time_known === false) {
        const endOfDay = new Date(start);
        endOfDay.setHours(23, 59, 59, 999);
        return endOfDay;
    }

    return start;
}

export function isEventPast(event) {
    const end = getEventEnd(event);
    return end ? end < new Date() : false;
}