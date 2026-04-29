// Upload page: sends image/PDF file to backend.
import { useState } from "react";

import { getApiErrorMessage } from "../services/api";
import { uploadDocument } from "../services/documentService";


function UploadPage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (!selectedFile) {
            setErrorMessage("Please choose a file before uploading.");
            return;
        }

        setIsSubmitting(true);
        try {
            await uploadDocument(selectedFile);
            setSuccessMessage("Upload successful.");
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="card">
            <h2>Upload Document</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(event) => setSelectedFile(event.target.files[0])}
                />
                <button type="submit">Upload</button>
                {errorMessage && <p>{errorMessage}</p>}
                {successMessage && <p>{successMessage}</p>}
                {isSubmitting && <p>Uploading file...</p>}
            </form>
        </section>
    );
}


export default UploadPage;
