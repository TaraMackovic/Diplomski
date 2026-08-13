export function parseJwt(token) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export function getCurrentUserId() {
    const token = localStorage.getItem("access_token");
    if (!token) return null;

    const payload = parseJwt(token);
    return payload?.user_id ?? null;
}

export function isLoggedIn() {
    return !!localStorage.getItem("access_token");
}