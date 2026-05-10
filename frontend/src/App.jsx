// Main route setup for all pages.
import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentListPage from "./pages/DocumentListPage";
import DocumentViewerPage from "./pages/DocumentViewerPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UploadPage from "./pages/UploadPage";
import UsersPage from "./pages/UsersPage";


function AppShell() {
    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content">
                <Routes>
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute requireUser>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/upload"
                        element={
                            <ProtectedRoute requireUser>
                                <UploadPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/search"
                        element={
                            <ProtectedRoute requireUser>
                                <DocumentListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/documents" element={<Navigate to="/search" replace />} />
                    <Route
                        path="/documents/:id"
                        element={
                            <ProtectedRoute requireUser>
                                <DocumentViewerPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requireAdmin>
                                <AdminPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute requireAdmin>
                                <UsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
            </main>
        </div>
    );
}


function App() {
    return (
        <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <AppShell />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}


export default App;
