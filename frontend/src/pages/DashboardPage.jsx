// Dashboard — live stats with status breakdown and recent documents.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    FileText,
    FolderOpen,
    Upload,
    XCircle,
} from "lucide-react";

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
        { label: "Total Documents", value: stats.total_documents, icon: FileText },
        { label: "Completed", value: stats.processed_files, icon: CheckCircle2 },
        { label: "Processing", value: stats.pending_uploads, icon: Clock3 },
        { label: "Failed", value: stats.failed_documents, icon: XCircle },
    ] : [];

    return (
        <section className="dashboard-page">
            <div className="hero-section">
                <h1>Every tool you need for scanned documents</h1>
                <p>Upload, recognize, correct, and search multilingual scanned documents in one place.</p>
                <div className="features-grid">
                    {[
                        { to: "/upload", title: "Upload & Extract", icon: Upload, text: "Upload PDFs or images and instantly extract text with multilingual OCR." },
                        { to: "/search", title: "Search & View", icon: FolderOpen, text: "Browse processed documents, search text, and view annotations." },
                    ].map((a) => (
                        <Link key={a.to} to={a.to} style={{ textDecoration: "none", color: "inherit" }}>
                            <article className="feature-card">
                                <a.icon size={48} strokeWidth={1.5} />
                                <h3>{a.title}</h3>
                                <p>{a.text}</p>
                            </article>
                        </Link>
                    ))}
                </div>
            </div>

            {errorMessage && <p className="error-msg" style={{ marginBottom: 16 }}>{errorMessage}</p>}

            <div className="section-row" style={{ marginTop: 20 }}>
                <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Dashboard Statistics</h2>
            </div>

            {/* Stat cards */}
            <div className="stats-grid">
                {isLoading
                    ? [1, 2, 3, 4].map((i) => (
                        <article key={i} className="glass-card stat-card skeleton" />
                    ))
                    : statCards.map((item) => (
                        <article key={item.label} className="glass-card stat-card">
                            <item.icon size={26} color="var(--primary)" />
                            <h3 style={{ margin: "6px 0 0", fontSize: "2.2rem" }}>{item.value}</h3>
                            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.88rem" }}>{item.label}</p>
                        </article>
                    ))
                }
            </div>

            {/* Recent documents */}
            <section className="glass-card recent-documents-panel" style={{ marginTop: 32 }}>
                <div className="section-row">
                    <h3 style={{ margin: 0 }}>Recent Documents</h3>
                    <Link to="/search" style={{ fontSize: "0.88rem", color: "var(--accent-alt)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        View all <ArrowRight size={14} />
                    </Link>
                </div>

                {isLoading && <p className="muted-text">Loading…</p>}

                {!isLoading && (!stats?.recent_documents || stats.recent_documents.length === 0) && (
                    <p className="muted-text">No documents yet. <Link to="/upload" style={{color: "var(--primary)"}}>Upload your first document.</Link></p>
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
                            <Link to={`/documents/${doc.id}`} className="btn-link-primary" style={{ padding: "6px 12px", fontSize: "0.82rem" }}>
                                View
                            </Link>
                        </div>
                    </div>
                ))}
            </section>
        </section>
    );
}


export default DashboardPage;
