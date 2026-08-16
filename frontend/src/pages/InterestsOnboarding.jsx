import { useNavigate } from "react-router-dom";
import InterestSelector from "../components/InterestSelector";
import "../styles/InterestSelector.css";

function InterestsOnboarding() {
    const navigate = useNavigate();
    const goToHome = () => navigate("/userHome");

    return (
        <div className="interests-overlay">
            <div className="interests-popup">
                <div className="interests-header">
                    <svg
                        className="interests-illustration"
                        viewBox="0 0 100 100"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle cx="50" cy="50" r="45" fill="#EEF0FB" />
                        <circle cx="50" cy="50" r="30" fill="#D6DAF5" />
                        <circle cx="50" cy="50" r="15" fill="#37388E" />
                        <circle cx="50" cy="50" r="5" fill="#EB5A5A" />
                    </svg>

                    <div>
                        <h1>Lični interesi</h1>
                        <p>Odaberi bar 3 interesovanja (opciono).</p>
                    </div>
                </div>

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