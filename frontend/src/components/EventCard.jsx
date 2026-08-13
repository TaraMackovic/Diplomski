import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../services/api";

import shareIcon from "../assets/icons/icon_share.png";
import saveIcon from "../assets/icons/icon_to_save.png";
import unsaveIcon from "../assets/icons/icon_to_unsave.png";
import placeholder from "../assets/icons/welcome_logo.png";

import "../styles/EventCard.css";

function EventCard({ event }) {

    const navigate = useNavigate();

    const [saved, setSaved] = useState(false);
    const [checkingSaved, setCheckingSaved] = useState(true);

    const isLoggedIn = () => !!localStorage.getItem("access_token");

    const checkIfSaved = async () => {
        if (!isLoggedIn()) {
            setCheckingSaved(false);
            return;
        }

        try {
            const response = await api.get(`/events/${event.id}/is-saved/`);
            setSaved(response.data.saved);
        } catch (err) {
            console.log(err);
        } finally {
            setCheckingSaved(false);
        }
    };

    useEffect(() => {
        checkIfSaved();
    }, [event.id]);

    const openDetails = () => {
        navigate(`/events/${event.id}`);
    };

    const shareEvent = (e) => {
        e.stopPropagation();

        if (navigator.share) {
            navigator.share({
                title: event.title,
                text:
                    `${event.title}\n` +
                    `${event.location}\n` +
                    `${event.date}`,
            });
        } else {
            navigator.clipboard.writeText(
                `${window.location.origin}/events/${event.id}`
            );
        }
    };

    const saveEvent = async (e) => {
        e.stopPropagation();

        if (!isLoggedIn()) {
            alert("Morate biti prijavljeni da biste sačuvali događaj.");
            navigate("/login");
            return;
        }

        try {
            const response = await api.post(`/events/${event.id}/save/`);
            setSaved(response.data.saved);
        } catch (err) {
            console.log(err);
        }
    };

    const formatDate = (date) => {

        try {

            return new Date(date).toLocaleString("sr-BA",{

                day:"2-digit",
                month:"2-digit",
                year:"numeric",
                hour:"2-digit",
                minute:"2-digit"

            });
        } catch {
            return date;
        }
    };

    return (
        <div
            className="event-card"
            onClick={openDetails}
        >
            <div className="event-image-wrapper">
                <img
                    className="event-image"
                    src={event.image || placeholder}
                    alt={event.title}
                />
                <div className="event-price">
                    {
                        event.price === 0
                            ? "Ulaz: besplatan"
                            : `Ulaz: ${event.price} KM`
                    }
                </div>
            </div>

            <div className="event-body">
                <h3 className="event-title">
                    {event.title}
                </h3>
                <div className="event-footer">
                    <div>
                        <div className="event-date">
                            {formatDate(event.date)}
                        </div>
                        <div className="event-location">
                            {event.location}
                        </div>
                    </div>

                    <div className="event-actions">
                        <img
                            src={shareIcon}
                            alt=""
                            onClick={shareEvent}
                        />
                        <img
                            src={
                                saved
                                    ? unsaveIcon
                                    : saveIcon
                            }
                            alt=""
                            onClick={saveEvent}
                            className={checkingSaved ? "icon-loading" : ""}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EventCard;