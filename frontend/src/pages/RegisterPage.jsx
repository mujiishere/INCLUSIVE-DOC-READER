// Register page: creates a new user account.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { registerUser } from "../services/authService";


function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: "", email: "", password: "" });

    async function handleSubmit(event) {
        event.preventDefault();
        await registerUser(formData);
        navigate("/login");
    }

    return (
        <section className="card">
            <h2>Register</h2>
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
            </form>
        </section>
    );
}


export default RegisterPage;
