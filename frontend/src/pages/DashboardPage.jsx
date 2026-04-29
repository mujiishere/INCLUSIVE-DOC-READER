// Dashboard landing page wired to backend stats endpoint.
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "../services/api";
import { getDashboardStats } from "../services/documentService";

const actions = [
    {
        title: "Upload Document",
        text: "Upload and process new documents with OCR.",
    },
    {
        title: "Search Documents",
        text: "Find documents by keywords and extracted text.",
    },
    {
        title: "Manage Tags",
        text: "Organize your document library by category.",
    },
];

function DashboardPage() {
    const [stats, setStats] = useState([
        { label: "Total Documents", value: "0", delta: "" },
        { label: "Processed Files", value: "0", delta: "" },
        { label: "Pending Upload", value: "0", delta: "" },
        { label: "Recent Activity", value: "0", delta: "" },
    ]);
    const [recentDocs, setRecentDocs] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        setErrorMessage("");
        try {
            const data = await getDashboardStats();
            setStats([
                { label: "Total Documents", value: String(data.total_documents), delta: "" },
                { label: "Processed Files", value: String(data.processed_files), delta: "" },
                { label: "Pending Upload", value: String(data.pending_uploads), delta: "" },
                { label: "Recent Activity", value: String(data.recent_activity), delta: "" },
            ]);
            setRecentDocs(data.recent_documents || []);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    }

    return (
        <section>
            <header className="page-header">
                <h2>Dashboard</h2>
                <p>Welcome back! Here is what is happening with your documents.</p>
            </header>
            {errorMessage && <p>{errorMessage}</p>}

            <div className="stats-grid">
                {stats.map((item) => (
                    <article key={item.label} className="glass-card stat-card">
                        <p className="stat-delta">{item.delta}</p>
                        <h3>{item.value}</h3>
                        <p>{item.label}</p>
                    </article>
                ))}
            </div>

            <div className="action-grid">
                {actions.map((action) => (
                    <article key={action.title} className="glass-card">
                        <h3>{action.title}</h3>
                        <p>{action.text}</p>
                    </article>
                ))}
            </div>

            <section className="glass-card">
                <div className="section-row">
                    <h3>Recent Documents</h3>
                    <span>View all</span>
                </div>

                {recentDocs.map((doc) => (
                    <div key={doc.id} className="recent-row">
                        <div>
                            <p className="recent-title">{doc.file_name}</p>
                            <p className="muted-text">{new Date(doc.uploaded_at).toLocaleString()}</p>
                        </div>
                        <span className="status-pill">{doc.status}</span>
                    </div>
                ))}
                {recentDocs.length === 0 && <p className="muted-text">No recent documents yet.</p>}
            </section>
        </section>
    );
}


export default DashboardPage;
