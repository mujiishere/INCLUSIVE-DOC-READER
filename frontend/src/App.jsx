// Main route setup for all pages.
import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import DocumentListPage from "./pages/DocumentListPage";
import DocumentViewerPage from "./pages/DocumentViewerPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UploadPage from "./pages/UploadPage";


function App() {
    return (
        <>
            <Navbar />
            <main className="container">
                <Routes>
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    <Route
                        path="/upload"
                        element={
                            <ProtectedRoute>
                                <UploadPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/documents"
                        element={
                            <ProtectedRoute>
                                <DocumentListPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/documents/:id"
                        element={
                            <ProtectedRoute>
                                <DocumentViewerPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="*" element={<Navigate to="/documents" />} />
                </Routes>
            </main>
        </>
    );
}


export default App;
