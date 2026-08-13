function getStartOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isSameDay(date, reference) {
    return getStartOfDay(date).getTime() === getStartOfDay(reference).getTime();
}

function isThisWeek(date) {
    const now = new Date();
    const d = new Date(date);

    const dayIndex = (now.getDay() + 6) % 7; 
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayIndex);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return d >= startOfWeek && d < endOfWeek;
}

function isWeekend(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
}

function haversineKm(lat1, lon1, lat2, lon2) {
    if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined)) {
        return Infinity;
    }
    const R = 6371;
    const toRad = (v) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

export const DEFAULT_FILTERS = {
    sort: null,
    dateOption: "any",
    customDateFrom: "",
    customDateTo: "",
    categories: [],
    onlyFree: false,
};

export function applyFilters(events, filters, userLocation) {
    let result = [...events];

    if (filters.categories.length > 0) {
        result = result.filter((e) => filters.categories.includes(e.category?.id));
    }

    if (filters.onlyFree) {
        result = result.filter((e) => e.price === 0);
    }

    const now = new Date();

    switch (filters.dateOption) {
        case "today":
            result = result.filter((e) => isSameDay(e.date, now));
            break;
        case "tomorrow": {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            result = result.filter((e) => isSameDay(e.date, tomorrow));
            break;
        }
        case "week":
            result = result.filter((e) => isThisWeek(e.date));
            break;
        case "weekend":
            result = result.filter((e) => isWeekend(e.date));
            break;
        case "custom":
            if (filters.customDateFrom && filters.customDateTo) {
                const from = new Date(filters.customDateFrom);
                const to = new Date(filters.customDateTo);
                to.setHours(23, 59, 59, 999);
                result = result.filter((e) => {
                    const d = new Date(e.date);
                    return d >= from && d <= to;
                });
            }
            break;
        default:
            break;
    }

    switch (filters.sort) {
        case "az":
            result.sort((a, b) => a.title.localeCompare(b.title, "sr"));
            break;
        case "date":
            result.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case "distance":
            if (userLocation) {
                result.sort((a, b) => {
                    const da = haversineKm(userLocation.lat, userLocation.lon, a.latitude, a.longitude);
                    const db = haversineKm(userLocation.lat, userLocation.lon, b.latitude, b.longitude);
                    return da - db;
                });
            }
            break;
        default:
            break;
    }

    return result;
}

export function countActiveFilters(filters) {
    let count = 0;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.onlyFree) count += 1;
    if (filters.dateOption !== "any") count += 1;
    return count;
}