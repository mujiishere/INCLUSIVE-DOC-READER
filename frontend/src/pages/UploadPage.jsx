// Upload page: sends image/PDF file to backend.
import { useState } from "react";

import { uploadDocument } from "../services/documentService";


function UploadPage() {
    const [selectedFile, setSelectedFile] = useState(null);

    async function handleSubmit(event) {
        event.preventDefault();
        if (!selectedFile) {
            return;
        }

        await uploadDocument(selectedFile);
        alert("Upload successful");
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
            </form>
        </section>
    );
}


export default UploadPage;
