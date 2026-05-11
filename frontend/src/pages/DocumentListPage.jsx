// Document list page with status badges, language filter, delete, and search.
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, RefreshCw, Search, Trash2 } from "lucide-react";

import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../services/api";
import {
    deleteDocument,
    getDocumentStatus,
    getDocuments,
    getDocumentsWithFilters,
    searchDocuments,
} from "../services/documentService";


const LANG_OPTIONS = [
    { value: "", label: "All Languages" },
    { value: "en", label: "English" },
    { value: "hi", label: "Hindi" },
    { value: "ml", label: "Malayalam" },
    { value: "ta", label: "Tamil" },
    { value: "te", label: "Telugu" },
    { value: "kn", label: "Kannada" },
    { value: "ur", label: "Urdu" },
];

const PROCESSING_STATUSES = new Set(["pending", "ocr_processing", "ai_correction"]);

function DocumentListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [documents, setDocuments] = useState([]);
    const [query, setQuery] = useState(searchParams.get("q") || "");
    const [langFilter, setLangFilter] = useState(searchParams.get("lang") || "");
    const [tagFilter, setTagFilter] = useState(searchParams.get("tag") || "");
    const [snippets, setSnippets] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const pollRef = useRef(null);

    useEffect(() => {
        const q = searchParams.get("q") || "";
        const lang = searchParams.get("lang") || "";
        const tag = searchParams.get("tag") || "";

        setQuery(q);
        setLangFilter(lang);
        setTagFilter(tag);

        if (q || lang || tag) {
            runSearch(q, lang, tag);
        } else {
            loadDocuments("");
        }

        return () => clearInterval(pollRef.current);
    }, [searchParams]);

    // Poll status for any in-progress documents every 4 seconds
    useEffect(() => {
        clearInterval(pollRef.current);
        const processingDocs = documents.filter((d) => PROCESSING_STATUSES.has(d.status));
        if (processingDocs.length === 0) return;

        pollRef.current = setInterval(async () => {
            const updates = await Promise.allSettled(
                processingDocs.map((d) => getDocumentStatus(d.id))
            );
            setDocuments((prev) =>
                prev.map((doc) => {
                    const found = updates.find(
                        (r) => r.status === "fulfilled" && r.value.id === doc.id
                    );
                    return found ? { ...doc, ...found.value } : doc;
                })
            );
        }, 4000);

        return () => clearInterval(pollRef.current);
    }, [documents]);

    async function loadDocuments(activeTag = tagFilter) {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const data = activeTag
                ? await getDocumentsWithFilters({ tag: activeTag })
                : await getDocuments();
            setDocuments(Array.isArray(data) ? data : data.results || []);
            setSnippets({});
        } catch (err) {
            setErrorMessage(getApiErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    async function runSearch(activeQuery = query, activeLang = langFilter, activeTag = tagFilter) {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const data = await searchDocuments(activeQuery, activeLang, activeTag);
            const results = data.results || [];
            setDocuments(results);
            const sm = {};
            results.forEach((d) => { if (d.snippet) sm[d.id] = d.snippet; });
            setSnippets(sm);
        } catch (err) {
            setErrorMessage(getApiErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    function handleSearch() {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (langFilter) params.set("lang", langFilter);
        if (tagFilter.trim()) params.set("tag", tagFilter.trim());
        setSearchParams(params);
    }

    function handleKeyDown(e) {
        if (e.key === "Enter") handleSearch();
    }

    async function handleDelete(doc) {
        if (!window.confirm(`Delete "${doc.title || doc.original_filename}"? This cannot be undone.`)) return;
        setDeletingId(doc.id);
        try {
            await deleteDocument(doc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch (err) {
            setErrorMessage(getApiErrorMessage(err));
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <section>
            <header className="page-header">
                <h2>Documents</h2>
                <p>Search and manage your uploaded documents.</p>
            </header>

            {/* Search bar */}
            <div className="search-row" style={{ marginTop: 20 }}>
                <input
                    type="text"
                    placeholder="Search extracted text…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ flex: 1, marginTop: 0, marginBottom: 0 }}
                />
                <select
                    value={langFilter}
                    onChange={(e) => setLangFilter(e.target.value)}
                    className="lang-select"
                >
                    {LANG_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Filter tag (e.g. Important)"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    style={{ width: 220, margin: 0 }}
                />
                <button onClick={handleSearch} className="btn-search" style={{ margin: 0, width: "auto", padding: "10px 20px" }}>
                    Search
                </button>
                <button onClick={() => loadDocuments()} className="btn-ghost" style={{ margin: 0, width: "auto", padding: "10px 14px" }} title="Refresh">
                    <RefreshCw size={16} />
                </button>
            </div>

            {errorMessage && <p className="error-msg" style={{ marginTop: 12 }}>{errorMessage}</p>}
            {isLoading && <p className="muted-text" style={{ marginTop: 16 }}>Loading…</p>}

            {!isLoading && documents.length === 0 && (
                <div className="glass-card empty-state" style={{ marginTop: 20 }}>
                    <Search size={34} style={{ color: "var(--text-muted)" }} />
                    <p style={{ marginTop: 8 }}>No documents found. <Link to="/upload">Upload one now.</Link></p>
                </div>
            )}

            <div className="doc-grid" style={{ marginTop: 16 }}>
                {documents.map((doc) => (
                    <article key={doc.id} className="glass-card doc-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ margin: "0 0 4px", fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {doc.title || doc.original_filename || `Document #${doc.id}`}
                                </h3>
                                <p className="muted-text" style={{ margin: 0, fontSize: "0.8rem" }}>
                                    {new Date(doc.created_at).toLocaleString("en-IN")}
                                    {doc.page_count > 0 && ` · ${doc.page_count} page${doc.page_count !== 1 ? "s" : ""}`}
                                </p>
                            </div>
                            <StatusBadge status={doc.status} />
                        </div>

                        {/* Detected languages */}
                        {doc.languages && doc.languages.length > 0 && (
                            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {doc.languages.map((l) => (
                                    <span key={l} className="lang-pill" style={{ fontSize: "0.75rem" }}>{l}</span>
                                ))}
                            </div>
                        )}

                        {/* Tags */}
                        {doc.tags && doc.tags.length > 0 && (
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {doc.tags.map((t) => (
                                    <span key={t.id} className="tag-pill">#{t.name}</span>
                                ))}
                            </div>
                        )}

                        {/* Search snippet */}
                        {snippets[doc.id] && (
                            <p style={{ margin: "10px 0 0", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                                "…{snippets[doc.id]}…"
                            </p>
                        )}

                        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                            <Link
                                to={`/documents/${doc.id}?q=${encodeURIComponent(query || "")}${doc.match_page ? `&page=${doc.match_page}` : ""}`}
                                className="btn-link-primary"
                                style={{ flex: 1, textAlign: "center" }}
                            >
                                View
                            </Link>
                            <button
                                className="btn-danger"
                                onClick={() => handleDelete(doc)}
                                disabled={deletingId === doc.id}
                                style={{ width: "auto", padding: "8px 14px", margin: 0 }}
                                title="Delete document"
                            >
                                {deletingId === doc.id ? <Loader2 size={16} className="spin-icon" /> : <Trash2 size={16} />}
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}


export default DocumentListPage;
