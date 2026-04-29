// Document list page: shows uploaded docs and supports search.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import SearchBar from "../components/SearchBar";
import { getApiErrorMessage } from "../services/api";
import { getDocuments, searchDocuments } from "../services/documentService";


function DocumentListPage() {
    const [documents, setDocuments] = useState([]);
    const [query, setQuery] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadDocuments();
    }, []);

    async function loadDocuments() {
        setErrorMessage("");
        setIsLoading(true);

        try {
            const data = await getDocuments();
            setDocuments(data);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSearch() {
        setErrorMessage("");
        setIsLoading(true);

        try {
            const data = await searchDocuments(query);
            setDocuments(data);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <section>
            <header className="page-header">
                <h2>Search Documents</h2>
                <p>Find uploaded files by keyword from extracted OCR text.</p>
            </header>

            <SearchBar query={query} onQueryChange={setQuery} onSearch={handleSearch} />
            {errorMessage && <p>{errorMessage}</p>}
            {isLoading && <p>Loading documents...</p>}
            {!isLoading && documents.length === 0 && <p>No documents found.</p>}

            {documents.map((doc) => (
                <article key={doc.id} className="glass-card">
                    <h3>Document #{doc.id}</h3>
                    <p className="muted-text">Uploaded: {new Date(doc.uploaded_at).toLocaleString()}</p>
                    <Link to={`/documents/${doc.id}`}>View Details</Link>
                </article>
            ))}
        </section>
    );
}


export default DocumentListPage;
