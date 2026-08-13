import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/InterestSelector.css";

function InterestSelector({ onSaved, minRequired = 3, showSkip = false, onSkip }) {
    const [interests, setInterests] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadInterests();
    }, []);

    const loadInterests = async () => {
        try {
            setLoading(true);
            const [allRes, mineRes] = await Promise.all([
                api.get("/interests/"),
                api.get("/my-interests/"),
            ]);
            setInterests(allRes.data);
            setSelected(new Set(mineRes.data.interest_ids));
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const toggle = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setError("");
    };

    const handleSave = async () => {
        if (selected.size < minRequired) {
            setError(`Odaberi najmanje ${minRequired} interesovanja.`);
            return;
        }

        try {
            setSaving(true);
            await api.post("/my-interests/", {
                interest_ids: Array.from(selected),
            });
            onSaved && onSaved();
        } catch (err) {
            console.log(err);
            setError("Greška pri čuvanju interesovanja.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="interests-loading">Učitavanje...</p>;

    return (
        <div className="interest-selector">
            <div className="interest-list">
                {interests.map((interest) => (
                    <button
                        key={interest.id}
                        type="button"
                        className={
                            selected.has(interest.id)
                                ? "interest-item selected"
                                : "interest-item"
                        }
                        onClick={() => toggle(interest.id)}
                    >
                        {interest.name}
                    </button>
                ))}
            </div>

            {error && <p className="interests-error">{error}</p>}

            <div className="interest-actions">
                <button className="interest-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? "Čuvanje..." : "Sačuvaj"}
                </button>

                {showSkip && (
                    <button className="interest-skip-btn" onClick={onSkip}>
                        Preskoči
                    </button>
                )}
            </div>
        </div>
    );
}

export default InterestSelector;