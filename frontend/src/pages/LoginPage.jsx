// Login page: authenticates user and stores token.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../services/api";
import { loginUser, saveToken } from "../services/authService";


function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const data = await loginUser(formData);
            saveToken(data.token);
            navigate("/documents");
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="auth-page">
            <div className="card auth-card">
                <h2>Welcome Back</h2>
                <p className="muted-text">Sign in to continue to DocuOrbit.</p>
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
                    {errorMessage && <p>{errorMessage}</p>}
                    {isSubmitting && <p>Signing in...</p>}
                </form>
            </div>
        </section>
    );
}


export default LoginPage;
