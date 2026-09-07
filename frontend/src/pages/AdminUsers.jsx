import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Pagination from "../components/Pagination";
import Confirmation from "../components/Confirmation";
import "../styles/AdminPanel.css";

function AdminUsers() {
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [ordering, setOrdering] = useState("-date_joined");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [activeTarget, setActiveTarget] = useState(null);
    const [activeError, setActiveError] = useState("");

    const [staffTarget, setStaffTarget] = useState(null);
    const [staffError, setStaffError] = useState("");

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState("");

    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
        role: "user",
    });
    const [createError, setCreateError] = useState("");
    const [createSaving, setCreateSaving] = useState(false);

    const openCreate = () => {
        setCreating(true);
        setCreateForm({
            first_name: "",
            last_name: "",
            username: "",
            email: "",
            password: "",
            role: "user",
        });
        setCreateError("");
    };

    useEffect(() => {
        loadUsers();
    }, [search, statusFilter, roleFilter, ordering, page]);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, roleFilter, ordering]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin-api/users/", {
                params: {
                    search,
                    status: statusFilter,
                    role: roleFilter,
                    ordering,
                    page,
                    page_size: 15,
                },
            });
            setUsers(response.data.results);
            setTotalPages(response.data.meta.total_pages);
        } catch (err) {
            console.log(err);
            setError("Ne mogu da učitam korisnike.");
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (user) => {
        try {
            await api.post(`/admin-api/users/${user.id}/toggle-active/`);
            loadUsers();
        } catch (err) {
            console.log(err);
            alert(err.response?.data?.message || "Greška.");
        }
    };

    const confirmToggleActive = async () => {
        try {
            await api.post(`/admin-api/users/${activeTarget.id}/toggle-active/`);
            setActiveTarget(null);
            setActiveError("");
            loadUsers();
        } catch (err) {
            setActiveError(err.response?.data?.message || "Greška.");
        }
    };

    const confirmToggleStaff = async () => {
        try {
            await api.post(`/admin-api/users/${staffTarget.id}/toggle-staff/`);
            setStaffTarget(null);
            setStaffError("");
            loadUsers();
        } catch (err) {
            setStaffError(err.response?.data?.message || "Greška.");
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/admin-api/users/${deleteTarget.id}/delete/`);
            setDeleteTarget(null);
            setDeleteError("");
            loadUsers();
        } catch (err) {
            setDeleteError(err.response?.data?.message || "Greška prilikom brisanja.");
        }
    };

    const handleCreateChange = (e) => {
        setCreateForm({ ...createForm, [e.target.name]: e.target.value });
    };

    const handleCreateUser = async () => {
        const validationError = validateCreateForm();
        if (validationError) {
            setCreateError(validationError);
            return;
        }

        try {
            setCreateSaving(true);
            setCreateError("");

            await api.post("/admin-api/users/", {
                first_name: createForm.first_name,
                last_name: createForm.last_name,
                username: createForm.username,
                email: createForm.email,
                password: createForm.password,
                is_staff: createForm.role === "admin",
            });

            setCreating(false);
            loadUsers();
        } catch (err) {
            console.log(err);

            const data = err.response?.data;

            if (data?.message) {
                setCreateError(data.message);
            } else if (data && typeof data === "object") {
                const firstField = Object.keys(data)[0];
                const firstMsg = Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField];
                setCreateError(firstMsg || "Greška prilikom kreiranja korisnika.");
            } else {
                setCreateError("Greška prilikom kreiranja korisnika.");
            }
        } finally {
            setCreateSaving(false);
        }
    };

    const validateCreateForm = () => {
        if (!createForm.first_name.trim() || !createForm.last_name.trim()) {
            return "Ime i prezime su obavezni.";
        }

        if (!createForm.username.trim()) {
            return "Korisničko ime je obavezno.";
        }

        if (createForm.username.length < 3) {
            return "Korisničko ime mora imati najmanje 3 karaktera.";
        }

        if (!createForm.email.trim()) {
            return "Email je obavezan.";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(createForm.email)) {
            return "Unesite ispravnu email adresu.";
        }

        if (!createForm.password) {
            return "Lozinka je obavezna.";
        }

        if (createForm.password.length < 8) {
            return "Lozinka mora imati najmanje 8 karaktera.";
        }

        return "";
    };

    return (
        <div>
            <h1 className="admin-page-title">Korisnici</h1>

            <div className="admin-toolbar">
                <button className="admin-btn" onClick={openCreate}>+ Novi korisnik</button>
                <input
                    className="admin-search"
                    placeholder="Pretraži po imenu, username-u ili emailu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">Svi statusi</option>
                    <option value="active">Aktivni</option>
                    <option value="inactive">Deaktivirani</option>
                </select>

                <select className="admin-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">Sve uloge</option>
                    <option value="admin">Administratori</option>
                    <option value="user">Korisnici</option>
                </select>

                <select className="admin-select" value={ordering} onChange={(e) => setOrdering(e.target.value)}>
                    <option value="-date_joined">Registracija (najnovija)</option>
                    <option value="date_joined">Registracija (najstarija)</option>
                    <option value="username">Korisničko ime (A-Š)</option>
                    <option value="-saved_events_count">Najviše sačuvanih</option>
                </select>
            </div>

            {loading ? (
                <p className="admin-empty">Učitavanje...</p>
            ) : error ? (
                <p className="admin-empty">{error}</p>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Ime i prezime</th>
                                <th>Email</th>
                                <th>Telefon</th>
                                <th>Registrovan</th>
                                <th>Sačuvano</th>
                                <th>Status</th>
                                <th>Uloga</th>
                                <th>Akcije</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={9} className="admin-empty">Nema korisnika.</td></tr>
                            ) : users.map((u) => (
                                <tr key={u.id}>
                                    <td>{u.username}</td>
                                    <td>{u.first_name} {u.last_name}</td>
                                    <td>{u.email}</td>
                                    <td>{u.phone_number || "—"}</td>
                                    <td>{new Date(u.date_joined).toLocaleDateString("sr-RS")}</td>
                                    <td>{u.saved_events_count}</td>
                                    <td>
                                        <span className={`admin-badge ${u.is_active ? "badge-active" : "badge-inactive"}`}>
                                            {u.is_active ? "Aktivan" : "Deaktiviran"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${u.is_staff ? "badge-staff" : "badge-user"}`}>
                                            {u.is_staff ? "Admin" : "Korisnik"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-row-actions">
                                            <button className="admin-icon-btn" onClick={() => navigate(`/admin/users/${u.id}`)}>
                                                Detalji
                                            </button>
                                            <button
                                                className="admin-icon-btn"
                                                onClick={() => {
                                                    setActiveTarget(u);
                                                    setActiveError("");
                                                }}
                                            >
                                                {u.is_active ? "Deaktiviraj" : "Aktiviraj"}
                                            </button>
                                            <button
                                                className="admin-icon-btn"
                                                onClick={() => {
                                                    setStaffTarget(u);
                                                    setStaffError("");
                                                }}
                                            >
                                                {u.is_staff ? "Ukloni admin" : "Postavi za admina"}
                                            </button>
                                            <button className="admin-icon-btn danger" onClick={() => { setDeleteTarget(u); setDeleteError(""); }}>
                                                Obriši
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />

            {deleteTarget && (
                <Confirmation
                    title="Obriši korisnika"
                    message={`Da li ste sigurni da želite obrisati korisnika "${deleteTarget.username}"? Ova akcija je nepovratna.`}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                    extraError={deleteError}
                />
            )}

            {activeTarget && (
                <Confirmation
                    title={activeTarget.is_active ? "Deaktiviraj korisnika" : "Aktiviraj korisnika"}
                    message={
                        activeTarget.is_active
                            ? `Da li ste sigurni da želite deaktivirati korisnika "${activeTarget.username}"?`
                            : `Da li želite aktivirati korisnika "${activeTarget.username}"?`
                    }
                    onConfirm={confirmToggleActive}
                    onCancel={() => setActiveTarget(null)}
                    extraError={activeError}
                    confirmLabel="Potvrdi"
                />
            )}

            {staffTarget && (
                <Confirmation
                    title={staffTarget.is_staff ? "Ukloni administratorsku ulogu" : "Postavi korisnika za administratora"}
                    message={
                        staffTarget.is_staff
                            ? `Da li ste sigurni da želite ukloniti administratorsku ulogu korisniku "${staffTarget.username}"?`
                            : `Da li ste sigurni da želite korisniku "${staffTarget.username}" dodijeliti administratorsku ulogu?`
                    }
                    onConfirm={confirmToggleStaff}
                    onCancel={() => setStaffTarget(null)}
                    extraError={staffError}
                    confirmLabel="Potvrdi"
                />
            )}
            {creating && (
                <Confirmation
                    title="Novi korisnik"
                    danger={false}
                    confirmLabel={createSaving ? "Kreiranje..." : "Kreiraj korisnika"}
                    onConfirm={handleCreateUser}
                    onCancel={() => setCreating(false)}
                    extraError={createError}
                    message={
                        <div className="profile-edit-form">
                            <label>
                                Ime
                                <input name="first_name" value={createForm.first_name} onChange={handleCreateChange} />
                            </label>
                            <label>
                                Prezime
                                <input name="last_name" value={createForm.last_name} onChange={handleCreateChange} />
                            </label>
                            <label>
                                Username
                                <input name="username" value={createForm.username} onChange={handleCreateChange} />
                            </label>
                            <label>
                                Email
                                <input name="email" type="email" value={createForm.email} onChange={handleCreateChange} />
                            </label>
                            <label>
                                Lozinka
                                <input name="password" type="password" value={createForm.password} onChange={handleCreateChange} />
                            </label>
                            <label>
                                Uloga
                                <select name="role" value={createForm.role} onChange={handleCreateChange}>
                                    <option value="user">Korisnik</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </label>
                        </div>
                    }
                />
            )}
        </div>
    );
}

export default AdminUsers;