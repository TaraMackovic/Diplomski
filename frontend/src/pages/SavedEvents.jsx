import { useEffect, useState } from "react";
import api from "../services/api";
import EventCard from "../components/EventCard";
import Pagination from "../components/Pagination";
import { mapEvent } from "../utils/mapEvent";
import "../styles/SavedEvents.css";

const EVENTS_PER_PAGE = 12;

function SavedEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [timeFilter, setTimeFilter] = useState("upcoming");
    const [page, setPage] = useState(1);

    useEffect(() => {
        loadSaved();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [timeFilter]);

    const loadSaved = async () => {
    try {
        setLoading(true);
        const response = await api.get("/saved-events/");
        setEvents(response.data.map(mapEvent));
    } catch (err) {
        console.log(err);
        setError("Ne mogu da učitam sačuvane događaje.");
    } finally {
        setLoading(false);
    }
};

    if (loading) return <h2>Učitavanje...</h2>;
    if (error) return <h2>{error}</h2>;

    const filteredEvents = events.filter((event) => {
        const isPast = new Date(event.date) < new Date();
        return timeFilter === "past" ? isPast : !isPast;
    });

    const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE) || 1;
    const paginatedEvents = filteredEvents.slice(
        (page - 1) * EVENTS_PER_PAGE,
        page * EVENTS_PER_PAGE
    );

    return (
        <div className="saved-page">
            <div className="saved-container">

                <h1 className="saved-title">
                    Sačuvani događaji
                </h1>

                <div className="time-toggle">
                    <button
                        className={timeFilter === "upcoming" ? "active" : ""}
                        onClick={() => setTimeFilter("upcoming")}
                    >
                        Nadolazeći
                    </button>
                    <button
                        className={timeFilter === "past" ? "active" : ""}
                        onClick={() => setTimeFilter("past")}
                    >
                        Prethodni
                    </button>
                </div>

                {filteredEvents.length === 0 ? (
                    <p className="saved-empty">
                        {timeFilter === "past"
                            ? "Nemaš prethodnih sačuvanih događaja."
                            : "Nemaš sačuvanih nadolazećih događaja."}
                    </p>
                ) : (
                    <>
                        <div className="event-grid">
                            {paginatedEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                />
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
        </div>
    );
}

export default SavedEvents;