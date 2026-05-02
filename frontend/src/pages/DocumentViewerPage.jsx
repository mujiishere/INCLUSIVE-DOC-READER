// Full side-by-side document viewer with region highlighting, tagging, annotation, search, and export.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../services/api";
import {
    addDocumentTag,
    addRegionTag,
    annotateRegion,
    exportDocument,
    getDocumentById,
    getDocumentStatus,
    getPageDetail,
    removeDocumentTag,
} from "../services/documentService";


// ── Language colour map ────────────────────────────────────────────────────

const LANG_COLORS = {
    en: { bg: "rgba(40,199,240,0.18)",  border: "#28c7f0", label: "#28c7f0" },
    hi: { bg: "rgba(255,153,51,0.18)",  border: "#ff9933", label: "#ff9933" },
    ml: { bg: "rgba(127,90,240,0.18)",  border: "#7f5af0", label: "#c4a7ff" },
    ta: { bg: "rgba(55,211,155,0.18)",  border: "#37d39b", label: "#37d39b" },
    te: { bg: "rgba(240,82,82,0.18)",   border: "#f05252", label: "#f08080" },
    kn: { bg: "rgba(255,214,0,0.15)",   border: "#ffd600", label: "#ffd600" },
    ur: { bg: "rgba(240,163,40,0.18)",  border: "#f0a328", label: "#f0c870" },
};

function langStyle(lang) {
    return LANG_COLORS[lang] || { bg: "rgba(146,160,207,0.15)", border: "#92a0cf", label: "#92a0cf" };
}

const PROCESSING = new Set(["pending", "ocr_processing", "ai_correction"]);

// ── Main component ────────────────────────────────────────────────────────

function DocumentViewerPage() {
    const { id } = useParams();
    const [document, setDocument] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageData, setPageData] = useState(null);
    const [loadingPage, setLoadingPage] = useState(false);

    const [activeRegionId, setActiveRegionId] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [showRaw, setShowRaw] = useState(false);

    const [newDocTag, setNewDocTag] = useState("");
    const [newRegionTag, setNewRegionTag] = useState("");
    const [annotation, setAnnotation] = useState("");
    const [annotationRegionId, setAnnotationRegionId] = useState(null);

    const [errorMessage, setErrorMessage] = useState("");
    const [actionMsg, setActionMsg] = useState("");
    const imgRef = useRef(null);
    const svgRef = useRef(null);
    const pollRef = useRef(null);
    const regionRefs = useRef({});

    // ── Load document ────────────────────────────────────────────────────
    useEffect(() => {
        loadDocument();
        return () => clearInterval(pollRef.current);
    }, [id]);

    async function loadDocument() {
        try {
            const data = await getDocumentById(id);
            setDocument(data);
            if (data.page_count > 0) {
                loadPage(id, 1);
            }
            // Poll if still processing
            if (PROCESSING.has(data.status)) {
                startPolling(data);
            }
        } catch (err) {
            setErrorMessage(getApiErrorMessage(err));
        }
    }

    function startPolling(doc) {
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            const status = await getDocumentStatus(id);
            setDocument((prev) => ({ ...prev, ...status }));
            if (!PROCESSING.has(status.status)) {
                clearInterval(pollRef.current);
                // Reload page once completed
                if (status.status === "completed" && status.page_count > 0) {
                    loadPage(id, currentPage);
                }
            }
        }, 3000);
    }

    // ── Load page detail ─────────────────────────────────────────────────
    async function loadPage(docId, pageNum) {
        setLoadingPage(true);
        setActiveRegionId(null);
        try {
            const data = await getPageDetail(docId, pageNum);
            setPageData(data);
        } catch (err) {
            setErrorMessage(getApiErrorMessage(err));
        } finally {
            setLoadingPage(false);
        }
    }

    function changePage(n) {
        setCurrentPage(n);
        loadPage(id, n);
    }

    // ── Region click ─────────────────────────────────────────────────────
    const handleRegionClick = useCallback((regionId) => {
        setActiveRegionId((prev) => (prev === regionId ? null : regionId));
        // Scroll text panel region into view
        setTimeout(() => {
            regionRefs.current[regionId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
    }, []);

    // ── Image overlay: compute scaled bbox ───────────────────────────────
    function scaledBbox(region) {
        if (!imgRef.current || !pageData) return null;
        const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imgRef.current;
        if (!naturalWidth || !clientWidth) return null;
        const sx = clientWidth / naturalWidth;
        const sy = clientHeight / naturalHeight;
        return {
            left: region.bbox_x * sx,
            top: region.bbox_y * sy,
            width: region.bbox_w * sx,
            height: region.bbox_h * sy,
        };
    }

    // ── Keyword highlight ─────────────────────────────────────────────────
    function highlightText(text) {
        if (!keyword || !text) return text;
        const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
        return parts.map((p, i) =>
            p.toLowerCase() === keyword.toLowerCase()
                ? <mark key={i}>{p}</mark>
                : p
        );
    }

    // ── Tags ──────────────────────────────────────────────────────────────
    async function handleAddDocTag(e) {
        e.preventDefault();
        if (!newDocTag.trim()) return;
        try {
            const tag = await addDocumentTag(id, newDocTag.trim());
            setDocument((prev) => ({ ...prev, tags: [...(prev.tags || []), tag] }));
            setNewDocTag("");
            flash("Tag added.");
        } catch (err) { setErrorMessage(getApiErrorMessage(err)); }
    }

    async function handleRemoveDocTag(tagId) {
        try {
            await removeDocumentTag(id, tagId);
            setDocument((prev) => ({ ...prev, tags: prev.tags.filter((t) => t.id !== tagId) }));
        } catch (err) { setErrorMessage(getApiErrorMessage(err)); }
    }

    async function handleAddRegionTag(e, regionId) {
        e.preventDefault();
        if (!newRegionTag.trim()) return;
        try {
            await addRegionTag(regionId, newRegionTag.trim());
            setNewRegionTag("");
            flash("Region tag added.");
            loadPage(id, currentPage);
        } catch (err) { setErrorMessage(getApiErrorMessage(err)); }
    }

    // ── Annotation ────────────────────────────────────────────────────────
    async function handleSaveAnnotation(e) {
        e.preventDefault();
        if (!annotationRegionId) return;
        try {
            await annotateRegion(annotationRegionId, annotation);
            flash("Annotation saved.");
            loadPage(id, currentPage);
        } catch (err) { setErrorMessage(getApiErrorMessage(err)); }
    }

    // ── Export ────────────────────────────────────────────────────────────
    async function handleExport(format) {
        try {
            const response = await exportDocument(id, format);
            const blob = new Blob([response.data], {
                type: format === "json" ? "application/json" : "text/plain",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${document?.original_filename || id}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) { setErrorMessage(getApiErrorMessage(err)); }
    }

    function flash(msg) {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(""), 3000);
    }

    // ── Copy text ─────────────────────────────────────────────────────────
    function handleCopyText() {
        if (!pageData) return;
        const text = pageData.regions
            .map((r) => (showRaw ? r.raw_text : r.corrected_text) || r.raw_text)
            .join("\n\n");
        navigator.clipboard.writeText(text).then(() => flash("Text copied!"));
    }

    // ── Render ────────────────────────────────────────────────────────────
    if (errorMessage) {
        return (
            <section>
                <p className="error-msg">{errorMessage}</p>
                <Link to="/search">← Back to Documents</Link>
            </section>
        );
    }

    if (!document) {
        return <p className="muted-text" style={{ padding: 20 }}>Loading document…</p>;
    }

    const isProcessing = PROCESSING.has(document.status);
    const regions = pageData?.regions || [];

    // Filter regions by keyword (for text panel)
    const filteredRegions = keyword
        ? regions.filter((r) => {
            const text = (showRaw ? r.raw_text : r.corrected_text) || r.raw_text || "";
            return text.toLowerCase().includes(keyword.toLowerCase());
        })
        : regions;

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>

            {/* ── Header ── */}
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h2 style={{ margin: 0, fontSize: "1.4rem" }}>
                            {document.title || document.original_filename || `Document #${document.id}`}
                        </h2>
                        <StatusBadge status={document.status} />
                    </div>
                    <p className="muted-text" style={{ margin: "4px 0 0", fontSize: "0.83rem" }}>
                        {document.page_count > 0 && `${document.page_count} pages · `}
                        {document.languages?.join(", ")}
                    </p>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => handleExport("txt")} className="btn-sm" style={{ margin: 0, width: "auto", padding: "7px 14px" }}>
                        Export TXT
                    </button>
                    <button onClick={() => handleExport("json")} className="btn-sm" style={{ margin: 0, width: "auto", padding: "7px 14px" }}>
                        Export JSON
                    </button>
                    <Link to="/search" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.88rem", color: "var(--text-muted)" }}>
                        ← Back
                    </Link>
                </div>
            </header>

            {/* ── Processing banner ── */}
            {isProcessing && (
                <div className="processing-banner">
                    <span className="spinner" />
                    <span>
                        {document.status === "ocr_processing" && "Running OCR on your document…"}
                        {document.status === "ai_correction" && "Applying AI correction to extracted text…"}
                        {document.status === "pending" && "Document queued for processing…"}
                    </span>
                </div>
            )}

            {document.status === "failed" && (
                <div className="error-banner">
                    ⚠ Processing failed: {document.error_message || "Unknown error."}
                </div>
            )}

            {actionMsg && <p className="success-msg">{actionMsg}</p>}
            {errorMessage && <p className="error-msg">{errorMessage}</p>}

            {/* ── Document tags ── */}
            <div className="glass-card" style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span className="muted-text" style={{ fontSize: "0.82rem" }}>Tags:</span>
                    {(document.tags || []).map((t) => (
                        <span key={t.id} className="tag-pill">
                            #{t.name}
                            <button
                                onClick={() => handleRemoveDocTag(t.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: "0 2px", margin: 0, width: "auto", fontSize: "0.8rem", minWidth: 0 }}
                                title="Remove tag"
                            >✕</button>
                        </span>
                    ))}
                    <form onSubmit={handleAddDocTag} style={{ display: "flex", gap: 4, margin: 0 }}>
                        <input
                            value={newDocTag}
                            onChange={(e) => setNewDocTag(e.target.value)}
                            placeholder="Add tag…"
                            style={{ margin: 0, padding: "4px 8px", fontSize: "0.82rem", width: 130 }}
                        />
                        <button type="submit" style={{ margin: 0, padding: "4px 10px", width: "auto", fontSize: "0.82rem" }}>+</button>
                    </form>
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                    type="text"
                    placeholder="Search in text…"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{ flex: 1, margin: 0, maxWidth: 300, padding: "8px 12px" }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input
                        type="checkbox"
                        checked={showRaw}
                        onChange={(e) => setShowRaw(e.target.checked)}
                        style={{ width: "auto", margin: 0 }}
                    />
                    Show raw OCR
                </label>
                <button onClick={handleCopyText} className="btn-sm" style={{ margin: 0, width: "auto", padding: "7px 14px" }}>
                    Copy Text
                </button>

                {/* Page navigation */}
                {document.page_count > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                        <button
                            onClick={() => changePage(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="btn-sm" style={{ margin: 0, width: "auto", padding: "7px 12px" }}
                        >←</button>
                        <span className="muted-text" style={{ fontSize: "0.88rem", whiteSpace: "nowrap" }}>
                            Page {currentPage} of {document.page_count}
                        </span>
                        <button
                            onClick={() => changePage(currentPage + 1)}
                            disabled={currentPage >= document.page_count}
                            className="btn-sm" style={{ margin: 0, width: "auto", padding: "7px 12px" }}
                        >→</button>
                    </div>
                )}
            </div>

            {/* ── Side-by-side viewer ── */}
            <div className="viewer-split">

                {/* LEFT: original image with region overlays */}
                <div className="viewer-image-panel">
                    {loadingPage && (
                        <div className="viewer-loading">
                            <span className="spinner" />
                            <span>Loading page…</span>
                        </div>
                    )}
                    {!loadingPage && pageData?.image_url && (
                        <div style={{ position: "relative", display: "inline-block", width: "100%", lineHeight: 0 }}>
                            <img
                                ref={imgRef}
                                src={pageData.image_url}
                                alt={`Page ${currentPage}`}
                                style={{ width: "100%", display: "block", borderRadius: 8 }}
                                onLoad={() => setActiveRegionId((prev) => prev)}
                            />
                            {/* Region overlays */}
                            {regions.map((region) => {
                                const bbox = scaledBbox(region);
                                if (!bbox) return null;
                                const ls = langStyle(region.language);
                                const isActive = activeRegionId === region.id;
                                return (
                                    <div
                                        key={region.id}
                                        onClick={() => handleRegionClick(region.id)}
                                        title={`[${region.language}] ${(region.corrected_text || region.raw_text || "").slice(0, 60)}`}
                                        style={{
                                            position: "absolute",
                                            left: bbox.left,
                                            top: bbox.top,
                                            width: bbox.width,
                                            height: bbox.height,
                                            border: `2px solid ${ls.border}`,
                                            background: isActive ? ls.bg.replace("0.18", "0.38") : ls.bg,
                                            boxShadow: isActive ? `0 0 0 3px ${ls.border}66` : "none",
                                            cursor: "pointer",
                                            transition: "background 0.15s, box-shadow 0.15s",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}
                    {!loadingPage && !pageData?.image_url && !isProcessing && (
                        <div className="viewer-loading">
                            <p className="muted-text">No page image available.</p>
                        </div>
                    )}
                    {isProcessing && !loadingPage && (
                        <div className="viewer-loading">
                            <span className="spinner" />
                            <span className="muted-text">Processing…</span>
                        </div>
                    )}
                </div>

                {/* RIGHT: text regions panel */}
                <div className="viewer-text-panel">
                    {/* Legend */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {Object.entries(LANG_COLORS).map(([lang, s]) => (
                            <span key={lang} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem" }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.border, display: "inline-block" }} />
                                <span style={{ color: s.label }}>{lang.toUpperCase()}</span>
                            </span>
                        ))}
                    </div>

                    {loadingPage && <p className="muted-text">Loading…</p>}

                    {!loadingPage && filteredRegions.length === 0 && !isProcessing && (
                        <p className="muted-text">{keyword ? "No regions match your search." : "No text regions found on this page."}</p>
                    )}

                    {filteredRegions.map((region) => {
                        const ls = langStyle(region.language);
                        const isActive = activeRegionId === region.id;
                        const text = (showRaw ? region.raw_text : region.corrected_text) || region.raw_text || "";
                        const isAnnotating = annotationRegionId === region.id;

                        return (
                            <div
                                key={region.id}
                                ref={(el) => { regionRefs.current[region.id] = el; }}
                                className="region-card"
                                style={{
                                    borderLeft: `3px solid ${ls.border}`,
                                    background: isActive ? ls.bg.replace("0.18", "0.28") : "transparent",
                                    transition: "background 0.15s",
                                    cursor: "pointer",
                                }}
                                onClick={() => setActiveRegionId((p) => p === region.id ? null : region.id)}
                            >
                                {/* Region header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ls.label, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                            {region.language || "?"}
                                        </span>
                                        <span className="muted-text" style={{ fontSize: "0.72rem" }}>
                                            {Math.round(region.confidence * 100)}% confidence
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(text);
                                                flash("Copied!");
                                            }}
                                            title="Copy text"
                                        >📋</button>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAnnotationRegionId((prev) => prev === region.id ? null : region.id);
                                                setAnnotation(region.annotation || "");
                                            }}
                                            title="Annotate"
                                        >✏️</button>
                                    </div>
                                </div>

                                {/* Text content */}
                                <p style={{
                                    margin: 0,
                                    fontSize: "0.9rem",
                                    lineHeight: 1.65,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    direction: region.language === "ur" ? "rtl" : "ltr",
                                }}>
                                    {highlightText(text)}
                                </p>

                                {/* Annotation display */}
                                {region.annotation && !isAnnotating && (
                                    <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "#f0a328", fontStyle: "italic" }}>
                                        📝 {region.annotation}
                                    </p>
                                )}

                                {/* Region tags */}
                                {region.tags && region.tags.length > 0 && (
                                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                        {region.tags.map((t) => (
                                            <span key={t.id} className="tag-pill" style={{ fontSize: "0.72rem" }}>#{t.name}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Expanded controls (when active) */}
                                {isActive && (
                                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10, borderTop: `1px solid ${ls.border}44`, paddingTop: 10 }}>

                                        {/* Annotation form */}
                                        {isAnnotating && (
                                            <form onSubmit={handleSaveAnnotation} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                                <input
                                                    value={annotation}
                                                    onChange={(e) => setAnnotation(e.target.value)}
                                                    placeholder="Add annotation…"
                                                    style={{ flex: 1, margin: 0, padding: "5px 8px", fontSize: "0.82rem" }}
                                                    autoFocus
                                                />
                                                <button type="submit" style={{ margin: 0, width: "auto", padding: "5px 10px", fontSize: "0.82rem" }}>Save</button>
                                                <button type="button" onClick={() => setAnnotationRegionId(null)} style={{ margin: 0, width: "auto", padding: "5px 10px", fontSize: "0.82rem", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Cancel</button>
                                            </form>
                                        )}

                                        {/* Tag region */}
                                        <form onSubmit={(e) => handleAddRegionTag(e, region.id)} style={{ display: "flex", gap: 6 }}>
                                            <input
                                                value={newRegionTag}
                                                onChange={(e) => setNewRegionTag(e.target.value)}
                                                placeholder="Tag this region…"
                                                style={{ flex: 1, margin: 0, padding: "5px 8px", fontSize: "0.82rem" }}
                                            />
                                            <button type="submit" style={{ margin: 0, width: "auto", padding: "5px 10px", fontSize: "0.82rem" }}>+Tag</button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}


export default DocumentViewerPage;
