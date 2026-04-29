// Document viewer page: shows one document and highlighted text.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import HighlightedText from "../components/HighlightedText";
import { getApiErrorMessage } from "../services/api";
import { getDocumentById } from "../services/documentService";


function DocumentViewerPage() {
    const { id } = useParams();
    const [documentItem, setDocumentItem] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        loadDocument();
    }, [id]);

    async function loadDocument() {
        setErrorMessage("");
        try {
            const data = await getDocumentById(id);
            setDocumentItem(data);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    }

    if (errorMessage) {
        return <p>{errorMessage}</p>;
    }

    if (!documentItem) {
        return <p>Loading document...</p>;
    }

    return (
        <section className="glass-card">
            <h2>Document #{documentItem.id}</h2>

            <a href={documentItem.file} target="_blank" rel="noreferrer">
                Open uploaded file
            </a>

            <input
                placeholder="Highlight keyword"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
            />

            <h3>Extracted Text</h3>
            <HighlightedText text={documentItem.extracted_text} keyword={keyword} />
        </section>
    );
}


export default DocumentViewerPage;
