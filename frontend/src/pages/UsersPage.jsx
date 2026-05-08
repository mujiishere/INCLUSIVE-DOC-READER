// Users page used by admin to view and manage account list.
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "../services/api";
import { getAdminUsers } from "../services/adminService";


function UsersPage() {
    const [users, setUsers] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        setErrorMessage("");
        try {
            const data = await getAdminUsers();
            setUsers(data);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    }

    function getRole(user) {
        if (user.is_staff) {
            return "Admin";
        }
        return "Viewer";
    }

    function getStatus(user) {
        if (user.is_active) {
            return "Active";
        }
        return "Inactive";
    }

    return (
        <section>
            <header className="page-header">
                <h2>Users</h2>
                <p>Admin view for user accounts and access status.</p>
            </header>
            {errorMessage && <p>{errorMessage}</p>}

            <div className="glass-card">
                <div className="section-row users-head">
                    <span>Username</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Documents</span>
                </div>

                {users.map((user) => (
                    <div key={user.id} className="section-row users-row">
                        <span>{user.username}</span>
                        <span>{user.email || "-"}</span>
                        <span>{getRole(user)}</span>
                        <span className="status-pill">{getStatus(user)}</span>
                        <span>{user.documents_uploaded ?? 0}</span>
                    </div>
                ))}
                {users.length === 0 && <p className="muted-text">No users available.</p>}
            </div>
        </section>
    );
}


export default UsersPage;
