// Public home page that can be browsed without login.
import { useNavigate } from "react-router-dom";

import PublicHeader from "../components/PublicHeader";


function HomePage() {
    const navigate = useNavigate();

    return (
        <section className="public-page">
            <PublicHeader />

            <header className="page-header" style={{ marginTop: 24 }}>
                <h2>Inclusive Document Reader</h2>
                <p>
                    Upload, process, tag, search, and annotate OCR documents in a secure,
                    role-aware platform.
                </p>
            </header>

            <p className="muted-text" style={{ marginTop: 8 }}>
                Login is only required for protected actions such as upload, personal files, and admin operations.
            </p>

            <div className="action-grid" style={{ marginTop: 20 }}>
                <article className="glass-card action-card">
                    <h3>Explore Public Interface</h3>
                    <p>You can browse this homepage without logging in.</p>
                </article>

                <article className="glass-card action-card">
                    <h3>Upload & Manage Documents</h3>
                    <p>Requires user login. You will be prompted when needed.</p>
                    <button onClick={() => navigate("/upload")}>Try Upload</button>
                </article>

                <article className="glass-card action-card">
                    <h3>Admin Monitoring</h3>
                    <p>Admin login required for user and document analytics.</p>
                    <button onClick={() => navigate("/admin")}>Open Admin Dashboard</button>
                </article>
            </div>
        </section>
    );
}


export default HomePage;
