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
            navigate("/documents");
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
        <section className="auth-page">
            <div className="card auth-card">
                <h2>User Login</h2>
                <p className="muted-text">Sign in as a normal user to upload and annotate documents.</p>
                {!showRegister && (
                    <form onSubmit={handleSubmit}>
                        <input
                            placeholder="Username"
                            value={formData.username}
                            onChange={(event) => setFormData({ ...formData, username: event.target.value })}
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

                {errorMessage && <p className="error-msg">{errorMessage}</p>}
                {successMessage && <p className="success-msg">{successMessage}</p>}
                {isSubmitting && <p>Please wait...</p>}

                <button
                    type="button"
                    className="btn-sm"
                    onClick={() => {
                        setShowRegister((prev) => !prev);
                        setErrorMessage("");
                        setSuccessMessage("");
                    }}
                    style={{ marginTop: 8 }}
                >
                    {showRegister ? "Back to Login" : "New user? Register here"}
                </button>

                <p className="muted-text" style={{ marginTop: 8 }}>
                    Admin account? <Link to="/admin-login">Go to Admin Login</Link>
                </p>
            </div>
        </section>
    );
}


export default LoginPage;
