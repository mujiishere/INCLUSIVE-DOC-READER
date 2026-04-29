// Blocks access to child routes when token is missing.
import { Navigate } from "react-router-dom";

import { getToken } from "../services/authService";


function ProtectedRoute({ children }) {
    if (!getToken()) {
        return <Navigate to="/login" replace />;
    }

    return children;
}


export default ProtectedRoute;
