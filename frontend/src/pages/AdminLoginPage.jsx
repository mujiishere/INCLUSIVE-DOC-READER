// Admin login page: only staff/superuser accounts allowed.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../services/api";
import { loginAdminUser, saveToken } from "../services/authService";


function AdminLoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const data = await loginAdminUser(formData);
            saveToken(data.token);
            navigate("/admin");
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="auth-page" style={{ background: "var(--surface-soft)" }}>
            <div className="card auth-card" style={{ padding: "40px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", borderRadius: "20px", border: "none" }}>
                <div style={{ textAlign: "center", marginBottom: "30px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px", borderRadius: "14px", background: "linear-gradient(145deg, var(--secondary), #000)", color: "white", fontSize: "1.5rem", fontWeight: "bold", marginBottom: "16px" }}>
                        A
                    </div>
                    <h2 style={{ fontSize: "1.8rem", margin: "0 0 8px" }}>Admin Portal</h2>
                    <p className="muted-text" style={{ margin: 0 }}>Sign in with admin account to access the dashboard.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input
                        placeholder="Admin Username"
                        value={formData.username}
                        onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                        style={{ padding: "12px 16px" }}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                        style={{ padding: "12px 16px" }}
                    />

                    <button type="submit" style={{ padding: "12px", background: "linear-gradient(90deg, #333, #000)" }}>Admin Login</button>
                </form>

                {errorMessage && <p className="error-msg" style={{ marginTop: "16px" }}>{errorMessage}</p>}
                {isSubmitting && <p style={{ textAlign: "center" }}>Signing in...</p>}

                <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
                    <p className="muted-text" style={{ margin: 0 }}>
                        Normal user? <Link to="/login" style={{ color: "var(--primary)", fontWeight: "600", textDecoration: "none" }}>Go to User Login</Link>
                    </p>
                </div>
            </div>
        </section>
    );
}


export default AdminLoginPage;
