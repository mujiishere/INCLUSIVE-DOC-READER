// Register page: creates a new user account.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../services/api";
import { registerUser } from "../services/authService";


function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: "", email: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            await registerUser(formData);
            navigate("/login");
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="auth-page">
            <div className="card auth-card">
                <h2>Create Account</h2>
                <p className="muted-text">Start using DocuOrbit OCR platform.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        placeholder="Username"
                        value={formData.username}
                        onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    />

                    <button type="submit">Create Account</button>
                    {errorMessage && <p>{errorMessage}</p>}
                    {isSubmitting && <p>Creating account...</p>}
                </form>
            </div>
        </section>
    );
}


export default RegisterPage;
