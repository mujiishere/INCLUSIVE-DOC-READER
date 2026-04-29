// Document list page: shows uploaded docs and supports search.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import SearchBar from "../components/SearchBar";
import { getDocuments, searchDocuments } from "../services/documentService";


function DocumentListPage() {
    const [documents, setDocuments] = useState([]);
    const [query, setQuery] = useState("");

    useEffect(() => {
        loadDocuments();
    }, []);

    async function loadDocuments() {
        const data = await getDocuments();
        setDocuments(data);
    }

    async function handleSearch() {
        const data = await searchDocuments(query);
        setDocuments(data);
    }

    return (
        <>
            <h2>Your Documents</h2>
            <SearchBar query={query} onQueryChange={setQuery} onSearch={handleSearch} />

            {documents.map((doc) => (
                <article key={doc.id} className="card">
                    <h3>Document #{doc.id}</h3>
                    <p>Uploaded: {new Date(doc.uploaded_at).toLocaleString()}</p>
                    <Link to={`/documents/${doc.id}`}>View Details</Link>
                </article>
            ))}
        </>
    );
}


export default DocumentListPage;
