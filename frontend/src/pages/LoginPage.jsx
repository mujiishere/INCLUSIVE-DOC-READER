// Login page: authenticates user and stores token.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../services/api";
import { loginNormalUser, registerUser, saveToken } from "../services/authService";


function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [registerData, setRegisterData] = useState({ username: "", email: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            const data = await loginNormalUser(formData);
            saveToken(data.token);
            navigate("/dashboard");
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRegister(event) {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            await registerUser(registerData);
            setSuccessMessage("Account created successfully. You can now login with your new user.");
            setShowRegister(false);
            setFormData({ username: registerData.username, password: registerData.password });
            setRegisterData({ username: "", email: "", password: "" });
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
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px", borderRadius: "14px", background: "linear-gradient(145deg, var(--primary), var(--secondary))", color: "white", fontSize: "1.5rem", fontWeight: "bold", marginBottom: "16px" }}>
                        D
                    </div>
                    <h2 style={{ fontSize: "1.8rem", margin: "0 0 8px" }}>{showRegister ? "Create Account" : "Welcome Back"}</h2>
                    <p className="muted-text" style={{ margin: 0 }}>{showRegister ? "Sign up to start extracting your documents." : "Sign in to continue to DocuOrbit."}</p>
                </div>
                
                {!showRegister && (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <input
                            placeholder="Username"
                            value={formData.username}
                            onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                            style={{ padding: "12px 16px" }}
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                        />

                        <button type="submit">Login</button>
                    </form>
                )}

                {showRegister && (
                    <form onSubmit={handleRegister}>
                        <input
                            placeholder="New Username"
                            value={registerData.username}
                            onChange={(event) => setRegisterData({ ...registerData, username: event.target.value })}
                        />

                        <input
                            type="email"
                            placeholder="Email"
                            value={registerData.email}
                            onChange={(event) => setRegisterData({ ...registerData, email: event.target.value })}
                        />

                        <input
                            type="password"
                            placeholder="New Password"
                            value={registerData.password}
                            onChange={(event) => setRegisterData({ ...registerData, password: event.target.value })}
                        />

                        <button type="submit">Create User Account</button>
                    </form>
                )}

                {errorMessage && <p className="error-msg" style={{ marginTop: "16px" }}>{errorMessage}</p>}
                {successMessage && <p className="success-msg" style={{ marginTop: "16px" }}>{successMessage}</p>}
                {isSubmitting && <p style={{ textAlign: "center" }}>Please wait...</p>}

                <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                            setShowRegister((prev) => !prev);
                            setErrorMessage("");
                            setSuccessMessage("");
                        }}
                        style={{ fontSize: "0.9rem", padding: "8px" }}
                    >
                        {showRegister ? "Already have an account? Log in" : "New user? Create an account"}
                    </button>
                </div>

                <p className="muted-text" style={{ marginTop: 8 }}>
                    Admin account? <Link to="/admin-login">Go to Admin Login</Link>
                </p>
            </div>
        </section>
    );
}


export default LoginPage;
