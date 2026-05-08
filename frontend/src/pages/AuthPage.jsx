// Unified auth page with User/Admin login tabs and signup form.
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../services/api";
import {
    loginAdminUser,
    loginNormalUser,
    registerUser,
    saveToken,
} from "../services/authService";


function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const requestedRole = query.get("role");
    const requestedTab = query.get("tab");
    const nextPath = query.get("next") || "/dashboard";

    const [mode, setMode] = useState(requestedRole === "admin" ? "admin" : "user");
    const [showRegister, setShowRegister] = useState(requestedTab === "register");
    const [formData, setFormData] = useState({ username: "", email: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleLogin(event) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const payload = { username: formData.username, password: formData.password };
            const response = mode === "admin"
                ? await loginAdminUser(payload)
                : await loginNormalUser(payload);

            saveToken(response.token);

            if (mode === "admin") {
                navigate(nextPath.startsWith("/admin") ? nextPath : "/admin", { replace: true });
            } else {
                navigate(nextPath.startsWith("/admin") ? "/dashboard" : nextPath, { replace: true });
            }
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRegister(event) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            await registerUser({
                username: formData.username,
                email: formData.email,
                password: formData.password,
            });
            setShowRegister(false);
            setMode("user");
            setErrorMessage("Registration successful. Please login as user.");
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="auth-page">
            <div className="card auth-card">
                <h2>{showRegister ? "Create Account" : "Sign In"}</h2>
                <p className="muted-text">
                    {showRegister
                        ? "Register to manage your personal documents."
                        : "Choose login mode. Default is User Login."}
                </p>

                {!showRegister && (
                    <div className="auth-segment">
                        <button
                            type="button"
                            className={mode === "user" ? "seg-btn active" : "seg-btn"}
                            onClick={() => setMode("user")}
                        >
                            User Login
                        </button>
                        <button
                            type="button"
                            className={mode === "admin" ? "seg-btn active" : "seg-btn"}
                            onClick={() => setMode("admin")}
                        >
                            Admin Login
                        </button>
                    </div>
                )}

                <form onSubmit={showRegister ? handleRegister : handleLogin}>
                    <input
                        placeholder="Username"
                        value={formData.username}
                        onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                    />

                    {showRegister && (
                        <input
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                        />
                    )}

                    <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    />

                    <button type="submit">
                        {showRegister ? "Register" : mode === "admin" ? "Admin Login" : "User Login"}
                    </button>
                </form>

                {errorMessage && <p className={errorMessage.startsWith("Registration successful") ? "success-msg" : "error-msg"}>{errorMessage}</p>}
                {isSubmitting && <p className="muted-text">Please wait...</p>}

                <div style={{ marginTop: 8 }}>
                    {!showRegister ? (
                        <p className="muted-text">
                            New user? <button type="button" className="text-link-btn" onClick={() => setShowRegister(true)}>Create account</button>
                        </p>
                    ) : (
                        <p className="muted-text">
                            Already have an account? <button type="button" className="text-link-btn" onClick={() => setShowRegister(false)}>Back to login</button>
                        </p>
                    )}
                </div>

                <p className="muted-text" style={{ marginTop: 8 }}>
                    <Link to="/">Back to Home</Link>
                </p>
            </div>
        </section>
    );
}


export default AuthPage;
