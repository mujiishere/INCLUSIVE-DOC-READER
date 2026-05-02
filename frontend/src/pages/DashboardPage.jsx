// Dashboard — live stats with status breakdown and recent documents.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../services/api";
import { getDashboardStats } from "../services/documentService";


function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { loadDashboard(); }, []);

    async function loadDashboard() {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const data = await getDashboardStats();
            setStats(data);
        } catch (err) {
            setErrorMessage(getApiErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    const statCards = stats ? [
        { label: "Total Documents", value: stats.total_documents, icon: "📁" },
        { label: "Completed",       value: stats.processed_files,  icon: "✅" },
        { label: "Processing",      value: stats.pending_uploads,  icon: "⚙️" },
        { label: "Failed",          value: stats.failed_documents, icon: "❌" },
    ] : [];

    return (
        <section>
            <header className="page-header">
                <h2>Dashboard</h2>
                <p>Welcome back — here is your document processing overview.</p>
            </header>

            {errorMessage && <p className="error-msg" style={{ marginTop: 16 }}>{errorMessage}</p>}

            {/* Stat cards */}
            <div className="stats-grid" style={{ marginTop: 22 }}>
                {isLoading
                    ? [1, 2, 3, 4].map((i) => (
                        <article key={i} className="glass-card stat-card skeleton" />
                    ))
                    : statCards.map((item) => (
                        <article key={item.label} className="glass-card stat-card">
                            <span style={{ fontSize: "1.6rem" }}>{item.icon}</span>
                            <h3 style={{ margin: "6px 0 0", fontSize: "2.2rem" }}>{item.value}</h3>
                            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.88rem" }}>{item.label}</p>
                        </article>
                    ))
                }
            </div>

            {/* Quick actions */}
            <div className="action-grid" style={{ marginTop: 16 }}>
                {[
                    { to: "/upload", title: "Upload Document", icon: "⬆️", text: "Upload PDFs or scanned images for multilingual OCR." },
                    { to: "/search", title: "Browse Documents", icon: "📂", text: "View, search, and manage all your processed documents." },
                ].map((a) => (
                    <Link key={a.to} to={a.to} style={{ textDecoration: "none" }}>
                        <article className="glass-card action-card">
                            <span style={{ fontSize: "1.8rem" }}>{a.icon}</span>
                            <h3 style={{ margin: "8px 0 4px" }}>{a.title}</h3>
                            <p className="muted-text" style={{ margin: 0, fontSize: "0.88rem" }}>{a.text}</p>
                        </article>
                    </Link>
                ))}
            </div>

            {/* Recent documents */}
            <section className="glass-card" style={{ marginTop: 16 }}>
                <div className="section-row">
                    <h3 style={{ margin: 0 }}>Recent Documents</h3>
                    <Link to="/search" style={{ fontSize: "0.88rem", color: "var(--accent-alt)" }}>View all →</Link>
                </div>

                {isLoading && <p className="muted-text">Loading…</p>}

                {!isLoading && (!stats?.recent_documents || stats.recent_documents.length === 0) && (
                    <p className="muted-text">No documents yet. <Link to="/upload">Upload your first document.</Link></p>
                )}

                {(stats?.recent_documents || []).map((doc) => (
                    <div key={doc.id} className="recent-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="recent-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {doc.title || doc.original_filename || `Document #${doc.id}`}
                            </p>
                            <p className="muted-text" style={{ margin: "2px 0 0", fontSize: "0.8rem" }}>
                                {new Date(doc.created_at).toLocaleString("en-IN")}
                                {doc.page_count > 0 && ` · ${doc.page_count} page${doc.page_count !== 1 ? "s" : ""}`}
                            </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <StatusBadge status={doc.status} />
                            <Link to={`/documents/${doc.id}`} style={{ fontSize: "0.82rem", color: "var(--accent-alt)", whiteSpace: "nowrap" }}>
                                View →
                            </Link>
                        </div>
                    </div>
                ))}
            </section>
        </section>
    );
}


export default DashboardPage;
