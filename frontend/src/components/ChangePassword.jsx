import { useState } from "react";
import api from "../services/api";
import "../styles/ChangePassword.css";

function ChangePassword({ onClose }) {
    const [form, setForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (form.new_password !== form.confirm_password) {
            setError("Nova lozinka i potvrda se ne poklapaju.");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/change-password/", form);
            setSuccess(response.data.message || "Lozinka je promijenjena.");
            setForm({ current_password: "", new_password: "", confirm_password: "" });

            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setError(
                err.response?.data?.message || "Greška pri promjeni lozinke."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Promjena lozinke</h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <label>
                        Trenutna lozinka
                        <input
                            type="password"
                            name="current_password"
                            value={form.current_password}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Nova lozinka
                        <input
                            type="password"
                            name="new_password"
                            value={form.new_password}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Potvrdi novu lozinku
                        <input
                            type="password"
                            name="confirm_password"
                            value={form.confirm_password}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    {error && <p className="modal-error">{error}</p>}
                    {success && <p className="modal-success">{success}</p>}

                    <div className="modal-actions">
                        <button type="submit" className="modal-save-btn" disabled={loading}>
                            {loading ? "Čuvanje..." : "Promijeni lozinku"}
                        </button>
                        <button type="button" className="modal-cancel-btn" onClick={onClose}>
                            Otkaži
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ChangePassword;