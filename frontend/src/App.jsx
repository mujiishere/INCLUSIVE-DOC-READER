// Main route setup with public home and protected actions.
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentListPage from "./pages/DocumentListPage";
import DocumentViewerPage from "./pages/DocumentViewerPage";
import HomePage from "./pages/HomePage";
import UploadPage from "./pages/UploadPage";
import UsersPage from "./pages/UsersPage";


function ProtectedLayout() {
    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}


function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/register" element={<Navigate to="/auth?tab=register" replace />} />
            <Route path="/admin-login" element={<Navigate to="/auth?role=admin" replace />} />

            <Route
                element={
                    <ProtectedRoute>
                        <ProtectedLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/search" element={<DocumentListPage />} />
                <Route path="/documents" element={<Navigate to="/search" replace />} />
                <Route path="/documents/:id" element={<DocumentViewerPage />} />
            </Route>

            <Route
                element={
                    <ProtectedRoute requireAdmin>
                        <ProtectedLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/users" element={<UsersPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}


export default App;
