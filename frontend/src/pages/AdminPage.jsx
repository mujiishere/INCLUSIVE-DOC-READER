// Admin page for simple platform-level controls.
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "../services/api";
import { getAdminSummary } from "../services/adminService";


function AdminPage() {
    const [summary, setSummary] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        loadAdminSummary();
    }, []);

    async function loadAdminSummary() {
        setErrorMessage("");
        try {
            const data = await getAdminSummary();
            setSummary(data);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    }

    return (
        <section>
            <header className="page-header">
                <h2>Admin Panel</h2>
                <p>Manage platform settings, moderation tasks, and system health.</p>
            </header>
            {errorMessage && <p>{errorMessage}</p>}

            <div className="action-grid">
                <article className="glass-card">
                    <h3>User Moderation</h3>
                    <p>
                        Total Users: {summary ? summary.total_users : "-"} | Active Users: {summary ? summary.active_users : "-"}
                    </p>
                </article>

                <article className="glass-card">
                    <h3>Document Governance</h3>
                    <p>
                        Total Docs: {summary ? summary.total_documents : "-"} | Completed: {summary ? summary.completed_documents : "-"}
                    </p>
                </article>

                <article className="glass-card">
                    <h3>System Insights</h3>
                    <p>
                        Staff Users: {summary ? summary.staff_users : "-"} | Processing: {summary ? summary.processing_documents : "-"} | Failed: {summary ? summary.failed_documents : "-"}
                    </p>
                </article>
            </div>
        </section>
    );
}


export default AdminPage;
