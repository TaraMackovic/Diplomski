import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserHome from "./pages/UserHome";
import EventDetails from "./pages/EventDetails";
import SavedEvents from "./pages/SavedEvents";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import InterestsOnboarding from "./pages/InterestsOnboarding";
import SessionExpired from "./components/SessionExpired";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import AdminSidebar from "./components/AdminSidebar";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCategories from "./pages/AdminCategories";


function AppLayout({ children }) {
    return (
        <>
            <Navbar />
            <div className="app-content">{children}</div>
        </>
    );
}

function AdminLayout({ children }) {
    return (
        <div className="admin-shell">
            <AdminSidebar />
            <div className="admin-content">{children}</div>
        </div>
    );
}

function RequireAuth({ children }) {
    const navigate = useNavigate();

    if (!localStorage.getItem("access_token")) {
        return <SessionExpired onClose={() => navigate("/userHome")} />;
    }

    return children;
}

function RequireAdmin({ children }) {
    const token = localStorage.getItem("access_token");
    const isStaff = localStorage.getItem("is_staff") === "true";

    if (!token) {
        return <Navigate to="/login" />;
    }

    if (!isStaff) {
        return <Navigate to="/userHome" />;
    }

    return children;
}

function SessionExpiredPrompt() {
    const [expired, setExpired] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = () => setExpired(true);
        window.addEventListener("unauthorized", handler);
        return () => window.removeEventListener("unauthorized", handler);
    }, []);

    if (!expired) return null;

    return (
        <SessionExpired
            message="Vaša sesija je istekla. Molimo prijavite se ponovo."
            onClose={() => {
                setExpired(false);
                navigate("/userHome");
            }}
        />
    );
}

function App() {
    return (
        <BrowserRouter>
            <SessionExpiredPrompt />
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

                <Route
                    path="/admin/dashboard"
                    element={
                        <RequireAdmin>
                            <AdminLayout>
                                <AdminDashboard />
                            </AdminLayout>
                        </RequireAdmin>
                    }
                />


                <Route
                    path="/admin/categories"
                    element={
                        <RequireAdmin>
                            <AdminLayout>
                                <AdminCategories />
                            </AdminLayout>
                        </RequireAdmin>
                    }
                />

                <Route path="/" element={<Navigate to="/userHome" />} />
                <Route path="*" element={<Navigate to="/userHome" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;