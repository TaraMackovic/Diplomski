import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserHome from "./pages/UserHome";
import EventDetails from "./pages/EventDetails";
import SavedEvents from "./pages/SavedEvents";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import InterestsOnboarding from "./pages/InterestsOnboarding";
import GuestAccess from "./components/GuestAccess";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";


function AppLayout({ children }) {
    return (
        <>
            <Navbar />
            <div className="app-content">{children}</div>
        </>
    );
}

function RequireAuth({ children }) {
    const navigate = useNavigate();

    if (!localStorage.getItem("access_token")) {
        return <GuestAccess onClose={() => navigate("/userHome")} />;
    }

    return children;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route
                    path="/userHome"
                    element={
                        <AppLayout>
                            <UserHome />
                        </AppLayout>
                    }
                />

                <Route
                    path="/events/:id"
                    element={
                        <AppLayout>
                            <EventDetails />
                        </AppLayout>
                    }
                />

                <Route
                    path="/saved"
                    element={
                        <AppLayout>
                            <RequireAuth>
                                <SavedEvents />
                            </RequireAuth>
                        </AppLayout>
                    }
                />

                <Route
                    path="/profile"
                    element={
                        <AppLayout>
                            <RequireAuth>
                                <Profile />
                            </RequireAuth>
                        </AppLayout>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <AppLayout>
                            <RequireAuth>
                                <Settings />
                            </RequireAuth>
                        </AppLayout>
                    }
                />

            
                <Route path="/interests" element={<InterestsOnboarding />} />

               
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

                <Route path="/" element={<Navigate to="/userHome" />} />
                <Route path="*" element={<Navigate to="/userHome" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;