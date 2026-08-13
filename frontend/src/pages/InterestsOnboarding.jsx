import { useNavigate } from "react-router-dom";
import InterestSelector from "../components/InterestSelector";
import "../styles/Register.css";
import "../styles/InterestSelector.css";

function InterestsOnboarding() {
    const navigate = useNavigate();
    const goToHome = () => navigate("/userHome");

    return (
        <div className="register-page">
            <div className="register-card">
                <h1 style={{ fontSize: 38 }}>Lični interesi</h1>
                <p style={{ textAlign: "center", color: "#555", marginTop: -10 }}>
                    Odaberi bar 3 interesovanja (opciono).
                </p>

                <InterestSelector
                    minRequired={3}
                    showSkip={true}
                    onSaved={goToHome}
                    onSkip={goToHome}
                />
            </div>
        </div>
    );
}

export default InterestsOnboarding;