// Blocks access to routes based on auth role requirements.
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { getCurrentUser, getToken } from "../services/authService";


function ProtectedRoute({ children, requireAdmin = false, requireUser = false }) {
    const [isLoading, setIsLoading] = useState(true);
    const [state, setState] = useState({ isAuthenticated: false, isAdmin: false });

    useEffect(() => {
        async function checkAccess() {
            const token = getToken();
            if (!token) {
                setState({ isAuthenticated: false, isAdmin: false });
                setIsLoading(false);
                return;
            }

            try {
                const user = await getCurrentUser();
                setState({
                    isAuthenticated: true,
                    isAdmin: Boolean(user.is_staff || user.is_superuser),
                });
            } catch {
                setState({ isAuthenticated: false, isAdmin: false });
            } finally {
                setIsLoading(false);
            }
        }

        checkAccess();
    }, [requireAdmin, requireUser]);

    if (isLoading) {
        return <p>Checking access...</p>;
    }

    if (!state.isAuthenticated) {
        return <Navigate to={requireAdmin ? "/admin-login" : "/login"} replace />;
    }

    if (requireAdmin && !state.isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    if (requireUser && state.isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return children;
}


export default ProtectedRoute;
