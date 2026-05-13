// Users page used by admin to view and manage account list.
import { useEffect, useState } from "react";
import { Edit2, Trash2, Plus, Search, X } from "lucide-react";

import { getApiErrorMessage } from "../services/api";
import { getAdminUsers, createUser, updateUser, deleteUser } from "../services/adminService";


function UsersPage() {
    const [users, setUsers] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetUser, setDeleteTargetUser] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ username: "", email: "", password: "", is_staff: false, is_active: true });

    useEffect(() => {
        if (!searchQuery.trim()) {
            loadUsers("");
            return;
        }

        const timer = setTimeout(() => {
            loadUsers(searchQuery);
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    async function loadUsers(query = "") {
        setErrorMessage("");
        try {
            const data = await getAdminUsers(query);
            setUsers(data);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    }

    function openModal(user = null) {
        if (user) {
            setEditingUser(user);
            setFormData({
                id: user.id,
                username: user.username,
                email: user.email || "",
                password: "", // don't load password
                is_staff: user.is_staff,
                is_active: user.is_active
            });
        } else {
            setEditingUser(null);
            setFormData({ username: "", email: "", password: "", is_staff: false, is_active: true });
        }
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setEditingUser(null);
        setErrorMessage("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrorMessage("");
        try {
            if (editingUser) {
                await updateUser(formData);
            } else {
                await createUser(formData);
            }
            closeModal();
            loadUsers(searchQuery);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    }

    function openDeleteModal(user) {
        setDeleteTargetUser(user);
        setDeleteConfirmText("");
        setDeleteErrorMessage("");
        setIsDeleteModalOpen(true);
    }

    function closeDeleteModal() {
        if (isDeleting) {
            return;
        }
        setIsDeleteModalOpen(false);
        setDeleteTargetUser(null);
        setDeleteConfirmText("");
        setDeleteErrorMessage("");
    }

    async function handleDeleteConfirm() {
        if (!deleteTargetUser) {
            return;
        }

        try {
            setIsDeleting(true);
            setDeleteErrorMessage("");
            await deleteUser(deleteTargetUser.id);
            closeDeleteModal();
            loadUsers(searchQuery);
        } catch (error) {
            setDeleteErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsDeleting(false);
        }
    }

    function getRole(user) {
        return user.is_staff ? "Admin" : "Viewer";
    }

    function getStatus(user) {
        return user.is_active ? "Active" : "Inactive";
    }

    return (
        <section>
            <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h2>User Database</h2>
                    <p>Add, update details, or delete user credentials.</p>
                </div>
                <button onClick={() => openModal()} className="btn-link-primary" style={{ display: "flex", alignItems: "center", gap: "6px", width: "auto" }}>
                    <Plus size={16} /> Add User
                </button>
            </header>
            {errorMessage && !isModalOpen && <p className="error-msg" style={{ margin: "16px 0" }}>{errorMessage}</p>}

            <div className="glass-card" style={{ overflowX: "auto" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                    <div className="header-search-trigger" style={{ width: "min(560px, 100%)" }}>
                        <Search className="header-search-icon" size={16} />
                        <input
                            type="text"
                            className="header-search-input"
                            placeholder="Search by username or email"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="section-row users-head" style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 100px", gap: "10px", paddingBottom: "10px", fontWeight: "600" }}>
                    <span>Username</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Uploads</span>
                    <span>Done</span>
                    <span>Proc.</span>
                    <span>Failed</span>
                    <span style={{ textAlign: "right" }}>Actions</span>
                </div>

                {users.map((user) => (
                    <div key={user.id} className="section-row users-row" style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 100px", gap: "10px", alignItems: "center" }}>
                        <span style={{ fontWeight: "500" }}>{user.username}</span>
                        <span className="muted-text">{user.email || "-"}</span>
                        <span><span className="tag-pill" style={{ background: user.is_staff ? "var(--accent-soft)" : "transparent" }}>{getRole(user)}</span></span>
                        <span><span className="lang-pill" style={{ background: user.is_active ? "var(--ok-soft)" : "var(--danger-soft)", color: user.is_active ? "var(--ok)" : "var(--danger)" }}>{getStatus(user)}</span></span>
                        <span>{user.documents_uploaded ?? 0}</span>
                        <span>{user.documents_completed ?? 0}</span>
                        <span>{user.documents_processing ?? 0}</span>
                        <span>{user.documents_failed ?? 0}</span>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button className="btn-icon" onClick={() => openModal(user)} title="Edit User"><Edit2 size={16} /></button>
                            <button className="btn-icon" onClick={() => openDeleteModal(user)} title="Delete User" style={{ color: "var(--danger)" }}><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
                {users.length === 0 && <p className="muted-text" style={{ padding: "20px 0", textAlign: "center" }}>No users available.</p>}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="app-modal-overlay">
                    <div className="glass-card app-modal" style={{ width: "min(400px, 90vw)", position: "relative" }}>
                        <button className="btn-icon" onClick={closeModal} style={{ position: "absolute", top: "16px", right: "16px" }}><X size={20} /></button>
                        <h3 style={{ marginTop: 0, marginBottom: "20px" }}>{editingUser ? "Edit User" : "Add New User"}</h3>
                        {errorMessage && <p className="error-msg" style={{ marginBottom: "16px" }}>{errorMessage}</p>}
                        
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div>
                                <label style={{ fontSize: "0.88rem", fontWeight: "600" }}>Username</label>
                                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.88rem", fontWeight: "600" }}>Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.88rem", fontWeight: "600" }}>Password {editingUser && "(Leave blank to keep current)"}</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUser} />
                            </div>
                            <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem" }}>
                                    <input type="checkbox" checked={formData.is_staff} onChange={e => setFormData({...formData, is_staff: e.target.checked})} style={{ width: "auto" }} />
                                    Is Admin
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem" }}>
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: "auto" }} />
                                    Active Account
                                </label>
                            </div>
                            <button type="submit" style={{ marginTop: "20px", width: "100%" }}>{editingUser ? "Save Changes" : "Create User"}</button>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="app-modal-overlay">
                    <div className="glass-card app-modal" style={{ width: "min(480px, 92vw)", border: "1px solid var(--danger-border)" }}>
                        <h3 style={{ marginTop: 0, marginBottom: 10, color: "var(--danger)" }}>Delete User</h3>
                        <p className="muted-text" style={{ marginTop: 0, marginBottom: 6 }}>
                            Are you sure you want to delete <strong style={{ color: "var(--text-main)" }}>{deleteTargetUser?.username}</strong>?
                        </p>
                        <p className="error-msg" style={{ marginBottom: 14 }}>
                            This action is permanent and cannot be undone. To confirm deletion, type <strong>CONFIRM</strong> below.
                        </p>

                        <label style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)" }}>
                            Confirmation
                        </label>
                        <input
                            type="text"
                            placeholder="Type CONFIRM to continue"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            disabled={isDeleting}
                            autoFocus
                        />

                        {deleteErrorMessage && <p className="error-msg" style={{ marginTop: 4 }}>{deleteErrorMessage}</p>}

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                            <button
                                type="button"
                                className="btn-ghost"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                                style={{ width: "auto", margin: 0, padding: "10px 16px" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={handleDeleteConfirm}
                                disabled={deleteConfirmText !== "CONFIRM" || isDeleting}
                                style={{ width: "auto", margin: 0, padding: "10px 16px" }}
                            >
                                {isDeleting ? "Deleting..." : "Permanently Delete User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default UsersPage;
