// Blocks access to child routes when token is missing.
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { getCurrentUser, getToken } from "../services/authService";


function ProtectedRoute({ children, requireAdmin = false }) {
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);

    useEffect(() => {
        async function checkAccess() {
            const token = getToken();
            if (!token) {
                setIsAllowed(false);
                setIsLoading(false);
                return;
            }

            if (!requireAdmin) {
                setIsAllowed(true);
                setIsLoading(false);
                return;
            }

            try {
                const user = await getCurrentUser();
                setIsAllowed(Boolean(user.is_staff || user.is_superuser));
            } catch {
                setIsAllowed(false);
            } finally {
                setIsLoading(false);
            }
        }

        checkAccess();
    }, [requireAdmin]);

    if (isLoading) {
        return <p>Checking access...</p>;
    }

    if (requireAdmin && !isAllowed) {
        const next = encodeURIComponent(`${location.pathname}${location.search}`);
        return <Navigate to={`/auth?role=admin&next=${next}`} replace />;
    }

    if (!getToken()) {
        const next = encodeURIComponent(`${location.pathname}${location.search}`);
        return <Navigate to={`/auth?next=${next}`} replace />;
    }

    return children;
}


export default ProtectedRoute;
