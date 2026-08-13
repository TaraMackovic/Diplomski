import { useEffect, useState } from "react";
import api from "../services/api";
import EventCard from "../components/EventCard";
import { mapEvent } from "../utils/mapEvent";
import "../styles/SavedEvents.css";

function SavedEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSaved();
    }, []);

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

    return (
        <div className="saved-page">
            <div className="saved-container">

                <h1 className="saved-title">
                    Sačuvani događaji
                </h1>

                {events.length === 0 ? (
                    <p className="saved-empty">
                        Nemaš sačuvanih događaja.
                    </p>
                ) : (
                    <div className="event-grid">
                        {events.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                            />
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}

export default SavedEvents;