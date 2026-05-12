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

            <section className="glass-card recent-documents-panel" style={{ marginTop: 32 }}>
                <div className="section-row">
                    <h3 style={{ margin: 0 }}>Realtime User Uploads</h3>
                </div>

                {!summary && <p className="muted-text">Loading…</p>}

                {summary && (!summary.recent_uploads || summary.recent_uploads.length === 0) && (
                    <p className="muted-text">No documents have been uploaded yet.</p>
                )}

                {(summary?.recent_uploads || []).map((doc) => (
                    <div key={doc.id} className="recent-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="recent-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {doc.title} <span className="muted-text" style={{ fontWeight: 400 }}>by @{doc.username}</span>
                            </p>
                            <p className="muted-text" style={{ margin: "2px 0 0", fontSize: "0.8rem" }}>
                                {new Date(doc.created_at).toLocaleString("en-IN")}
                            </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="lang-pill" style={{ 
                                background: doc.status === "completed" ? "var(--ok-soft)" : (doc.status === "failed" ? "var(--danger-soft)" : "var(--accent-soft)"), 
                                color: doc.status === "completed" ? "var(--ok)" : (doc.status === "failed" ? "var(--danger)" : "var(--accent)") 
                            }}>
                                {doc.status}
                            </span>
                        </div>
                    </div>
                ))}
            </section>
        </section>
    );
}

export default AdminPage;
