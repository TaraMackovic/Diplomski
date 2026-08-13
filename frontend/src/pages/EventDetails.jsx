import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import iconToSave from "../assets/icons/icon_to_save.png";
import iconToUnsave from "../assets/icons/icon_to_unsave.png";
import EventMap from "../components/EventMap";
import "../styles/EventDetails.css";

function EventDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [similarEvents, setSimilarEvents] = useState([]);

    useEffect(() => {
        loadEvent();
        checkIfSaved();
        loadSimilar();
    }, [id]);

    const loadEvent = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/events/${id}/`);
            setEvent(response.data);
        } catch (err) {
            console.log(err);
            setError("Ne mogu da učitam detalje događaja.");
        } finally {
            setLoading(false);
        }
    };

    const isLoggedIn = () => !!localStorage.getItem("access_token");

    const checkIfSaved = async () => {
        if (!isLoggedIn()) return;
        try {
            const response = await api.get(`/events/${id}/is-saved/`);
            setIsSaved(response.data.saved);
        } catch (err) {
            console.log(err);
        }
    };

    const toggleSave = async () => {
        if (!isLoggedIn()) {
            alert("Morate biti prijavljeni da biste sačuvali događaj.");
            navigate("/login");
            return;
        }

        try {
            const response = await api.post(`/events/${id}/save/`);
            setIsSaved(response.data.saved);
        } catch (err) {
            console.log(err);
        }
    };

    const shareEvent = async () => {
        const shareText = `${event.title}\n${event.location}\n${new Date(
            event.date
        ).toLocaleString()}\n\n${event.description}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: event.title, text: shareText });
            } catch (err) {
                console.log(err);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            alert("Detalji događaja kopirani u clipboard.");
        }
    };

    const loadSimilar = async () => {
        try {
            const response = await api.get(`/events/${id}/similar/`);
            setSimilarEvents(response.data);
        } catch (err) {
            console.log(err);
        }
    };

    if (loading) return <h2>Loading event...</h2>;
    if (error) return <h2>{error}</h2>;
    if (!event) return <h2>Događaj ne postoji</h2>;
    
    return (
        <div className="event-details-page">
            <div className="event-details-topbar">
                <button className="icon-btn" onClick={() => navigate(-1)}>‹ Nazad</button>
            </div>

            <div className="event-details-layout">
                {/* LIJEVA KOLONA — slika + opis + mapa */}
                <div className="event-details-left">
                    <img
                        className="event-details-image"
                        src={event.image || "https://via.placeholder.com/800x400"}
                        alt={event.title}
                    />

                    <h2 className="event-title">{event.title}</h2>

                    <div className="event-meta-row">
                        <span className="event-location">📍 {event.location}</span>
                        <span className="event-date">
                            📅 {new Date(event.date).toLocaleString("sr-RS", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>

                    <hr />

                    <h3>Opis događaja:</h3>
                    <p className="event-description">
                        {event.description}
                    </p>

                    {event.latitude && event.longitude && (
                        <>
                            <hr />
                            <h3>Lokacija na mapi:</h3>
                            <EventMap
                                latitude={event.latitude}
                                longitude={event.longitude}
                                title={event.title}
                                location={event.location}
                            />
                        </>
                    )}
                </div>

                {/* DESNA KOLONA — info kartica + slicni dogadjaji */}
                <div className="event-details-right">
                    <div className="event-sidebar-card">
                    

                        {event.status !== "active" && (
                            <p className="event-status">
                                Status: {event.status === "cancelled" ? "Otkazan" : "Završen"}
                            </p>
                        )}

                        <button className="save-toggle-btn" onClick={toggleSave}>
                            <img src={isSaved ? iconToUnsave : iconToSave} alt="save" />
                            {isSaved ? "Sačuvano" : "Sačuvaj događaj"}
                        </button>

                        <button className="share-btn" onClick={shareEvent}>
                            ⤴ Podijeli
                        </button>
                    </div>

                    {similarEvents.length > 0 && (
                        <div className="similar-sidebar-card">
                            <h3>Slični događaji</h3>
                            <div className="similar-events-list">
                                {similarEvents.map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="similar-event-row"
                                        onClick={() => navigate(`/events/${ev.id}`)}
                                    >
                                        <img
                                            src={ev.image || "https://via.placeholder.com/80"}
                                            alt={ev.title}
                                        />
                                        <div className="similar-event-info">
                                            <p className="similar-event-title">{ev.title}</p>
                                            <span className="similar-event-date">
                                                {new Date(ev.date).toLocaleDateString("sr-RS", {
                                                    day: "2-digit",
                                                    month: "short",
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EventDetails;