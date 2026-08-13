import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserHome from "./pages/UserHome";
import EventDetails from "./pages/EventDetails";
import SavedEvents from "./pages/SavedEvents";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import InterestsOnboarding from "./pages/InterestsOnboarding";

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
                            <SavedEvents />
                        </AppLayout>
                    }
                />

                <Route
                    path="/profile"
                    element={
                        <AppLayout>
                            <Profile />
                        </AppLayout>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <AppLayout>
                            <Settings />
                        </AppLayout>
                    }
                />

            
                <Route path="/interests" element={<InterestsOnboarding />} />

               
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />


                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;