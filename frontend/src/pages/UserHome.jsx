import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard";
import FilterDrawer from "../components/FilterDrawer";
import Pagination from "../components/Pagination";
import { mapEvent } from "../utils/mapEvent";
import { applyFilters, countActiveFilters, DEFAULT_FILTERS } from "../utils/applyFilters";
import "../styles/UserHome.css";

import searchIcon from "../assets/icons/icon_search.png";
import filterIcon from "../assets/icons/icon_filter.png";

const API_URL = "http://localhost:8000";
const EVENTS_PER_PAGE = 12;

function UserHome() {

    const [events, setEvents] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [userLocation, setUserLocation] = useState(null);

    const [page, setPage] = useState(1);

    useEffect(() => {
        loadEvents();
        loadRecommended();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, filters]);


    const loadEvents = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/events/`);
            const data = await response.json();
            setEvents(data.map(mapEvent));
        } catch {
            setError("Greška pri učitavanju događaja.");
        } finally {
            setLoading(false);
        }
    };

    const loadRecommended = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/events/recommended/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return;
            const data = await response.json();
            setRecommended(data.map(mapEvent));
        } catch (err) {
            console.log(err);
        }
    };

    const matchesSearch = (event, value) => {
        const v = value.toLowerCase();
        return (
            event.title.toLowerCase().includes(v) ||
            event.location.toLowerCase().includes(v) ||
            event.description.toLowerCase().includes(v)
        );
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);

        if (newFilters.sort === "distance" && !userLocation) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setUserLocation({
                            lat: pos.coords.latitude,
                            lon: pos.coords.longitude,
                        });
                    },
                    (err) => {
                        console.log("Lokacija odbijena ili nedostupna:", err);
                    }
                );
            }
        }
    };

    if (loading) return <h2>Učitavanje...</h2>;
    if (error) return <h2>{error}</h2>;

    const isSearching = search.trim().length > 0;
    const activeFilterCount = countActiveFilters(filters);
    const isFiltering = activeFilterCount > 0 || !!filters.sort;

    const showRecommended = !isSearching && !isFiltering;

    const recommendedIds = new Set(recommended.map((e) => e.id));

    const baseEvents = events;

    const searchedEvents = isSearching
        ? baseEvents.filter((e) => matchesSearch(e, search))
        : baseEvents;

    const resultEvents = applyFilters(searchedEvents, filters, userLocation);

    const totalPages = Math.ceil(resultEvents.length / EVENTS_PER_PAGE) || 1;
    const paginatedEvents = resultEvents.slice(
        (page - 1) * EVENTS_PER_PAGE,
        page * EVENTS_PER_PAGE
    );

    return (

        <div className="home-page">
            <div className="home-container">
                <div className="search-box">
                    <img src={searchIcon} className="search-icon" alt="" />
                    <input
                        placeholder="Pretraži događaje u Banjoj Luci"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                        className="filter-btn"
                        onClick={() => setShowFilterDrawer(true)}
                    >
                        <img src={filterIcon} alt="" />
                        {activeFilterCount > 0 && (
                            <span className="filter-badge">{activeFilterCount}</span>
                        )}
                    </button>
                </div>

                {showRecommended && recommended.length > 0 && (
                    <div className="recommended-section">
                        <h2 className="section-title">Preporučeno za tebe</h2>
                        <div className="recommended-scroll">
                            {recommended.map((event) => (
                                <div className="recommended-item" key={event.id}>
                                    <EventCard event={event} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <h2 className="section-title">
                    {isSearching
                        ? `Rezultati pretrage (${resultEvents.length})`
                        : isFiltering
                        ? `Filtrirani događaji (${resultEvents.length})`
                        : "Svi događaji"}
                </h2>
                {resultEvents.length === 0 ? (
                    <p className="no-results">
                        {isSearching
                            ? `Nema događaja koji odgovaraju pretrazi "${search}".`
                            : "Nema događaja koji odgovaraju odabranim filterima."}
                    </p>
                ) : (
                    <>
                        <div className="event-grid">
                            {paginatedEvents.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onChange={setPage}
                        />
                    </>
                )}

            </div>

            <FilterDrawer
                isOpen={showFilterDrawer}
                onClose={() => setShowFilterDrawer(false)}
                filters={filters}
                onApply={handleApplyFilters}
            />
        </div>
    );
}

export default UserHome;