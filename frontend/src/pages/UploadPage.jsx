// Upload page with file drag-drop, progress bar, and immediate status redirect.
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../services/api";
import { uploadDocument } from "../services/documentService";


function UploadPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [title, setTitle] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) acceptFile(file);
    }, []);

    function acceptFile(file) {
        setSelectedFile(file);
        setErrorMessage("");
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedFile) {
            setErrorMessage("Please choose a file before uploading.");
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(0);
        setErrorMessage("");

        try {
            const doc = await uploadDocument(selectedFile, title, setUploadProgress);
            // Navigate to viewer; processing runs in background
            navigate(`/documents/${doc.id}`);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    }

    const acceptedFormats = ".pdf, .png, .jpg, .jpeg, .tiff, .tif, .bmp, .webp";

    return (
        <section>
            <header className="page-header">
                <h2>Upload Document</h2>
                <p>Upload scanned PDFs or images — multilingual OCR runs automatically.</p>
            </header>

            <section className="glass-card" style={{ marginTop: 20, maxWidth: 640 }}>
                <form onSubmit={handleSubmit}>
                    {/* Drag-drop zone */}
                    <div
                        className={`upload-dropzone${isDragging ? " dragging" : ""}${selectedFile ? " has-file" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={acceptedFormats}
                            style={{ display: "none" }}
                            onChange={(e) => e.target.files[0] && acceptFile(e.target.files[0])}
                            id="file-input"
                        />
                        {selectedFile ? (
                            <div className="upload-file-info">
                                <span className="upload-icon">📄</span>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600 }}>{selectedFile.name}</p>
                                    <p className="muted-text" style={{ margin: 0 }}>
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setTitle(""); }}
                                    title="Remove file"
                                >✕</button>
                            </div>
                        ) : (
                            <div className="upload-placeholder">
                                <span className="upload-icon">☁️</span>
                                <p style={{ margin: "8px 0 4px", fontWeight: 600 }}>
                                    Drag &amp; drop or click to select
                                </p>
                                <p className="muted-text" style={{ margin: 0, fontSize: "0.82rem" }}>
                                    Supports PDF, PNG, JPG, TIFF, BMP, WebP
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Title field */}
                    <label style={{ display: "block", marginTop: 16, marginBottom: 4, color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        Document title (optional)
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Land Record 1987 — District Court Kerala"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isSubmitting}
                    />

                    {/* Progress bar */}
                    {isSubmitting && (
                        <div style={{ margin: "12px 0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span className="muted-text" style={{ fontSize: "0.85rem" }}>
                                    {uploadProgress < 100 ? "Uploading…" : "Processing started…"}
                                </span>
                                <span className="muted-text" style={{ fontSize: "0.85rem" }}>{uploadProgress}%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <p className="error-msg">{errorMessage}</p>
                    )}

                    <button type="submit" disabled={isSubmitting || !selectedFile} style={{ marginTop: 8 }}>
                        {isSubmitting ? "Uploading…" : "Upload & Process"}
                    </button>
                </form>
            </section>

            <section className="glass-card" style={{ marginTop: 16, maxWidth: 640 }}>
                <h3 style={{ margin: "0 0 10px" }}>Supported Languages</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                        "English", "Hindi (हिन्दी)", "Malayalam (മലയാളം)",
                        "Tamil (தமிழ்)", "Telugu (తెలుగు)", "Kannada (ಕನ್ನಡ)", "Urdu (اردو)",
                    ].map((lang) => (
                        <span key={lang} className="lang-pill">{lang}</span>
                    ))}
                </div>
            </section>
        </section>
    );
}


export default UploadPage;
