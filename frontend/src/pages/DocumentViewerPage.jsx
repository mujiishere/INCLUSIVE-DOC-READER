// Full side-by-side document viewer with region highlighting, tagging, annotation, search, and export.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Clipboard,
    PencilLine,
    X,
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../services/api";
import {
    addDocumentTag,
    addRegionTag,
    createRegionAnnotation,
    deleteRegionAnnotation,
    exportDocument,
    getDocumentAnnotations,
    getDocumentById,
    getDocumentStatus,
    getPageDetail,
    removeDocumentTag,
    removeRegionTag,
    updateRegionAnnotation,
} from "../services/documentService";


// ── Language colour map ────────────────────────────────────────────────────

const LANG_COLORS = {
    en: { bg: "rgba(5,144,145,0.18)", border: "#059091", label: "#059091" },
    hi: { bg: "rgba(115,139,109,0.18)", border: "#738B6D", label: "#738B6D" },
    ml: { bg: "rgba(78,153,146,0.2)", border: "#4e9992", label: "#4e9992" },
    ta: { bg: "rgba(141,154,109,0.2)", border: "#8d9a6d", label: "#8d9a6d" },
    te: { bg: "rgba(191,95,74,0.18)", border: "#bf5f4a", label: "#bf5f4a" },
    kn: { bg: "rgba(170,130,64,0.18)", border: "#aa8240", label: "#aa8240" },
    ur: { bg: "rgba(107,145,126,0.2)", border: "#6b917e", label: "#6b917e" },
};

function langStyle(lang) {
    return LANG_COLORS[lang] || { bg: "rgba(111,102,88,0.16)", border: "#6f6658", label: "#6f6658" };
}

const PROCESSING = new Set(["pending", "ocr_processing", "ai_correction"]);

// ── Main component ────────────────────────────────────────────────────────

function DocumentViewerPage() {
    const { id } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const queryKeyword = searchParams.get("q") || "";
    const queryPage = Number(searchParams.get("page") || "1");
    const [document, setDocument] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageData, setPageData] = useState(null);
    const [loadingPage, setLoadingPage] = useState(false);

    const [activeRegionId, setActiveRegionId] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [showRaw, setShowRaw] = useState(false);
    const [matchIndex, setMatchIndex] = useState(0);

    const [newDocTag, setNewDocTag] = useState("");
    const [newRegionTag, setNewRegionTag] = useState("");
    const [annotationCategory, setAnnotationCategory] = useState("Note");
    const [annotationNote, setAnnotationNote] = useState("");
    const [annotationCustomTag, setAnnotationCustomTag] = useState("");
    const [annotationRegionId, setAnnotationRegionId] = useState(null);
    const [editingAnnotationId, setEditingAnnotationId] = useState(null);
    const [documentAnnotations, setDocumentAnnotations] = useState([]);

    const [errorMessage, setErrorMessage] = useState("");
    const [actionMsg, setActionMsg] = useState("");
    const imgRef = useRef(null);
    const pollRef = useRef(null);
    const regionRefs = useRef({});
    const readableSegmentRefs = useRef({});

    // ── Load document ────────────────────────────────────────────────────
    useEffect(() => {
        setKeyword(queryKeyword);
    }, [queryKeyword, id]);

    useEffect(() => {
        loadDocument();
        return () => clearInterval(pollRef.current);
    }, [id, location.search]);

    async function loadDocument() {
        try {
            const data = await getDocumentById(id);
            setDocument(data);
            setDocumentAnnotations(data.annotations || []);
            if (data.page_count > 0) {
                const startPage = Number.isFinite(queryPage) && queryPage > 0
                    ? Math.min(queryPage, data.page_count)
                    : 1;
                setCurrentPage(startPage);
                loadPage(id, startPage);
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
            const annotations = await getDocumentAnnotations(docId);
            setDocumentAnnotations(annotations);
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
            const payload = {
                category: annotationCategory,
                note: annotationNote,
            };
            if (annotationCustomTag.trim()) {
                payload.custom_tag_name = annotationCustomTag.trim();
            }

            if (editingAnnotationId) {
                await updateRegionAnnotation(editingAnnotationId, payload);
            } else {
                await createRegionAnnotation(annotationRegionId, payload);
            }
            flash("Annotation saved.");
            setEditingAnnotationId(null);
            setAnnotationCategory("Note");
            setAnnotationNote("");
            setAnnotationCustomTag("");
            setAnnotationRegionId(null);
            loadPage(id, currentPage);
        } catch (err) { setErrorMessage(getApiErrorMessage(err)); }
    }

    async function handleDeleteAnnotation(annotationId) {
        try {
            await deleteRegionAnnotation(annotationId);
            flash("Annotation deleted.");
            if (editingAnnotationId === annotationId) {
                setEditingAnnotationId(null);
                setAnnotationCategory("Note");
                setAnnotationNote("");
                setAnnotationCustomTag("");
                setAnnotationRegionId(null);
            }
            loadPage(id, currentPage);
        } catch (err) {
            setErrorMessage(getApiErrorMessage(err));
        }
    }

    // ── Export ────────────────────────────────────────────────────────────
    async function handleExport(format) {
        try {
            const response = await exportDocument(id, format);
            const blob = new Blob([response.data], {
                type: format === "json" ? "application/json" : "text/plain",
            });
            const url = URL.createObjectURL(blob);
            const a = window.document.createElement("a");
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
            .map((r) => {
                const value = showRaw ? r.raw_text : r.corrected_text;
                return (value || "").trim();
            })
            .filter(Boolean)
            .join("\n\n");
        navigator.clipboard.writeText(text).then(() => flash("Text copied!"));
    }

    // ── Render preparation ────────────────────────────────────────────────
    const isProcessing = PROCESSING.has(document?.status || "");
    const regions = pageData?.regions || [];

    // Filter regions by keyword (for text panel)
    const filteredRegions = keyword
        ? regions.filter((r) => {
            const text = getRegionDisplayText(r);
            return text.toLowerCase().includes(keyword.toLowerCase());
        })
        : regions;

    const currentPageAnnotations = documentAnnotations.filter(
        (annotation) => annotation.region_page_number === currentPage
    );

    function getRegionAnnotations(regionId) {
        return documentAnnotations.filter((annotation) => annotation.region === regionId);
    }

    function getRegionDisplayText(region) {
        if (!region) {
            return "";
        }
        if (showRaw) {
            return region.raw_text || "";
        }
        if (region.corrected_text && region.corrected_text.trim()) {
            return region.corrected_text;
        }
        return "[No corrected text available yet for this region]";
    }

    const orderedRegions = useMemo(
        () => [...regions].sort((a, b) => (a.reading_order || 0) - (b.reading_order || 0)),
        [regions]
    );

    const matchedRegionIds = useMemo(() => {
        if (!keyword.trim()) {
            return [];
        }
        const lowerKeyword = keyword.toLowerCase();
        return orderedRegions
            .filter((region) => getRegionDisplayText(region).toLowerCase().includes(lowerKeyword))
            .map((region) => region.id);
    }, [keyword, orderedRegions, showRaw]);

    const readableParagraphs = useMemo(() => {
        const paragraphs = [];
        let current = [];
        let prev = null;

        for (const region of orderedRegions) {
            const text = getRegionDisplayText(region).trim();
            if (!text) {
                continue;
            }

            const startsNewParagraph =
                !prev ||
                Math.abs((region.bbox_y || 0) - (prev.bbox_y || 0)) > 30 ||
                ((region.language || "") !== (prev.language || "") && Math.abs((region.bbox_y || 0) - (prev.bbox_y || 0)) > 12);

            if (startsNewParagraph && current.length > 0) {
                paragraphs.push({
                    id: `para-${paragraphs.length + 1}`,
                    segments: current,
                });
                current = [];
            }

            current.push({
                regionId: region.id,
                text,
                language: region.language || "",
                confidence: region.confidence,
            });
            prev = region;
        }

        if (current.length > 0) {
            paragraphs.push({
                id: `para-${paragraphs.length + 1}`,
                segments: current,
            });
        }

        return paragraphs;
    }, [orderedRegions, showRaw]);

    useEffect(() => {
        if (!keyword || !orderedRegions.length) {
            return;
        }

        const lowerKeyword = keyword.toLowerCase();
        const firstMatch = orderedRegions.find((region) => {
            const text = getRegionDisplayText(region).toLowerCase();
            return text.includes(lowerKeyword);
        });

        if (firstMatch) {
            setMatchIndex(0);
            setActiveRegionId(firstMatch.id);
            const ref = readableSegmentRefs.current[firstMatch.id];
            if (ref) {
                ref.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [keyword, orderedRegions, showRaw]);

    useEffect(() => {
        function handleKeyNavigation(event) {
            if (event.key !== "Enter" || !keyword.trim()) {
                return;
            }

            const tagName = (event.target?.tagName || "").toLowerCase();
            if (tagName === "input" || tagName === "textarea" || tagName === "select") {
                return;
            }

            event.preventDefault();
            if (event.shiftKey) {
                jumpToMatch(matchIndex - 1);
            } else {
                jumpToMatch(matchIndex + 1);
            }
        }

        window.addEventListener("keydown", handleKeyNavigation);
        return () => window.removeEventListener("keydown", handleKeyNavigation);
    }, [keyword, matchIndex, matchedRegionIds]);

    function jumpToMatch(nextIndex) {
        if (!matchedRegionIds.length) {
            return;
        }
        const normalized = ((nextIndex % matchedRegionIds.length) + matchedRegionIds.length) % matchedRegionIds.length;
        const targetRegionId = matchedRegionIds[normalized];
        setMatchIndex(normalized);
        setActiveRegionId(targetRegionId);
        const ref = readableSegmentRefs.current[targetRegionId];
        if (ref) {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    async function handleRemoveRegionTag(regionId, tagId) {
        try {
            await removeRegionTag(regionId, tagId);
            flash("Region tag removed.");
            loadPage(id, currentPage);
        } catch (err) {
            setErrorMessage(getApiErrorMessage(err));
        }
    }

    function renderHighlightedSegment(text) {
        if (!keyword || !text) {
            return text;
        }

        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const parts = text.split(new RegExp(`(${escapedKeyword})`, "gi"));

        return parts.map((part, index) => {
            if (part.toLowerCase() === keyword.toLowerCase()) {
                return <mark key={index} className="ocr-search-mark">{part}</mark>;
            }
            return <span key={index}>{part}</span>;
        });
    }

    if (errorMessage && !document) {
        return (
            <section>
                <p className="error-msg">{errorMessage}</p>
                <Link to="/search" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ArrowLeft size={14} /> Back to Documents
                </Link>
            </section>
        );
    }

    if (!document) {
        return <p className="muted-text" style={{ padding: 20 }}>Loading document…</p>;
    }

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
                    <Link to="/search" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.88rem", color: "var(--text-muted)" }}>
                        <ArrowLeft size={14} /> Back
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
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={16} />
                        Processing failed: {document.error_message || "Unknown error."}
                    </span>
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
                            ><X size={12} /></button>
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

                {keyword.trim() && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                            onClick={() => jumpToMatch(matchIndex - 1)}
                            disabled={!matchedRegionIds.length}
                            className="btn-sm"
                            style={{ margin: 0, width: "auto", padding: "7px 10px" }}
                            title="Previous match"
                        >
                            <ArrowUp size={14} />
                        </button>
                        <span className="muted-text" style={{ fontSize: "0.82rem", minWidth: 90, textAlign: "center" }}>
                            {matchedRegionIds.length ? `${matchIndex + 1} of ${matchedRegionIds.length}` : "0 matches"}
                        </span>
                        <button
                            onClick={() => jumpToMatch(matchIndex + 1)}
                            disabled={!matchedRegionIds.length}
                            className="btn-sm"
                            style={{ margin: 0, width: "auto", padding: "7px 10px" }}
                            title="Next match"
                        >
                            <ArrowDown size={14} />
                        </button>
                    </div>
                )}

                {/* Page navigation */}
                {document.page_count > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                        <button
                            onClick={() => changePage(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="btn-sm" style={{ margin: 0, width: "auto", padding: "7px 12px" }}
                        ><ArrowLeft size={14} /></button>
                        <span className="muted-text" style={{ fontSize: "0.88rem", whiteSpace: "nowrap" }}>
                            Page {currentPage} of {document.page_count}
                        </span>
                        <button
                            onClick={() => changePage(currentPage + 1)}
                            disabled={currentPage >= document.page_count}
                            className="btn-sm" style={{ margin: 0, width: "auto", padding: "7px 12px" }}
                        ><ArrowRight size={14} /></button>
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
                                const hasAnnotations = getRegionAnnotations(region.id).length > 0;
                                const isMatch = matchedRegionIds.includes(region.id);
                                const shouldShowOverlay = isActive || hasAnnotations || isMatch;

                                if (!shouldShowOverlay) {
                                    return null;
                                }
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
                                            border: `2px solid ${isMatch ? "var(--accent-alt)" : hasAnnotations ? "var(--accent)" : ls.border}`,
                                            background: isActive
                                                ? ls.bg.replace("0.18", "0.38")
                                                : isMatch
                                                    ? "color-mix(in srgb, var(--accent-alt) 30%, transparent 70%)"
                                                    : ls.bg,
                                            boxShadow: isActive ? `0 0 0 3px ${hasAnnotations ? "color-mix(in srgb, var(--accent-alt) 45%, transparent 55%)" : `${ls.border}66`}` : "none",
                                            cursor: "pointer",
                                            transition: "background 0.15s, box-shadow 0.15s",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        {(hasAnnotations || isMatch) && (
                                            <span
                                                style={{
                                                    position: "absolute",
                                                    top: -10,
                                                    right: -10,
                                                    background: isMatch ? "color-mix(in srgb, var(--accent-alt) 32%, #fffaf0 68%)" : "color-mix(in srgb, var(--accent) 32%, #fffaf0 68%)",
                                                    color: "var(--text-inverse)",
                                                    borderRadius: 999,
                                                    fontSize: "0.65rem",
                                                    padding: "1px 6px",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {isMatch ? "M" : "A"}
                                            </span>
                                        )}
                                    </div>
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

                    <section className="readable-text-view">
                        {readableParagraphs.map((paragraph) => (
                            <p key={paragraph.id} className="readable-paragraph">
                                {paragraph.segments.map((segment) => {
                                    const style = langStyle(segment.language);
                                    const isActive = activeRegionId === segment.regionId;
                                    return (
                                        <span
                                            key={segment.regionId}
                                            ref={(element) => {
                                                readableSegmentRefs.current[segment.regionId] = element;
                                                regionRefs.current[segment.regionId] = element;
                                            }}
                                            className={isActive ? "readable-segment active" : "readable-segment"}
                                            style={{
                                                color: style.label,
                                                background: isActive ? `${style.border}22` : "transparent",
                                            }}
                                            onClick={() => handleRegionClick(segment.regionId)}
                                            title={`${(segment.language || "?").toUpperCase()} · ${Math.round((segment.confidence || 0) * 100)}% confidence`}
                                        >
                                            {renderHighlightedSegment(segment.text)}
                                            {" "}
                                        </span>
                                    );
                                })}
                            </p>
                        ))}
                    </section>

                    {activeRegionId && (() => {
                        const region = regions.find((item) => item.id === activeRegionId);
                        if (!region) {
                            return null;
                        }

                        const ls = langStyle(region.language);
                        const isAnnotating = annotationRegionId === region.id;
                        const regionAnnotations = getRegionAnnotations(region.id);

                        return (
                            <section className="region-card" style={{ borderLeft: `3px solid ${ls.border}` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <span style={{ fontSize: "0.78rem", color: ls.label, fontWeight: 700 }}>
                                        Region {region.reading_order + 1} · {(region.language || "?").toUpperCase()} · {Math.round(region.confidence * 100)}%
                                    </span>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                            className="btn-icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(getRegionDisplayText(region));
                                                flash("Copied!");
                                            }}
                                            title="Copy region"
                                        >
                                            <Clipboard size={14} />
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={() => {
                                                const latest = regionAnnotations[0] || null;
                                                setAnnotationRegionId((prev) => (prev === region.id ? null : region.id));
                                                if (latest) {
                                                    setEditingAnnotationId(latest.id);
                                                    setAnnotationCategory(latest.category || "Note");
                                                    setAnnotationNote(latest.note || "");
                                                    setAnnotationCustomTag(latest.custom_tag?.name || "");
                                                } else {
                                                    setEditingAnnotationId(null);
                                                    setAnnotationCategory("Note");
                                                    setAnnotationNote("");
                                                    setAnnotationCustomTag("");
                                                }
                                            }}
                                            title="Annotate"
                                        >
                                            <PencilLine size={14} />
                                        </button>
                                    </div>
                                </div>

                                {regionAnnotations.length > 0 && !isAnnotating && (
                                    <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                        {regionAnnotations.slice(0, 2).map((annotation) => (
                                            <div key={annotation.id} style={{ borderLeft: "2px solid var(--accent-alt)", paddingLeft: 8 }}>
                                                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--accent-alt)", fontWeight: 600 }}>
                                                    {annotation.category}
                                                    {annotation.custom_tag?.name ? ` · #${annotation.custom_tag.name}` : ""}
                                                </p>
                                                <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "var(--text-main)" }}>
                                                    {annotation.note || "No note"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {region.tags && region.tags.length > 0 && (
                                    <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {region.tags.map((tag) => (
                                            <span key={tag.id} className="tag-pill" style={{ fontSize: "0.75rem" }}>
                                                #{tag.name}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRegionTag(region.id, tag.id)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: "inherit",
                                                        margin: 0,
                                                        width: "auto",
                                                        minWidth: 0,
                                                        padding: "0 2px",
                                                        fontSize: "0.75rem",
                                                    }}
                                                    title="Remove region tag"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {isAnnotating && (
                                    <form onSubmit={handleSaveAnnotation} style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                                        <select
                                            value={annotationCategory}
                                            onChange={(e) => setAnnotationCategory(e.target.value)}
                                            style={{ margin: 0, padding: "6px 8px", fontSize: "0.82rem" }}
                                        >
                                            <option value="Signature">Signature</option>
                                            <option value="Stamp">Stamp</option>
                                            <option value="Name">Name</option>
                                            <option value="Date">Date</option>
                                            <option value="Amount">Amount</option>
                                            <option value="Clause">Clause</option>
                                            <option value="Note">Note</option>
                                        </select>
                                        <textarea
                                            value={annotationNote}
                                            onChange={(e) => setAnnotationNote(e.target.value)}
                                            placeholder="Add note/comment…"
                                            style={{ margin: 0, padding: "6px 8px", fontSize: "0.82rem", minHeight: 58 }}
                                        />
                                        <input
                                            value={annotationCustomTag}
                                            onChange={(e) => setAnnotationCustomTag(e.target.value)}
                                            placeholder="Optional custom tag…"
                                            style={{ margin: 0, padding: "6px 8px", fontSize: "0.82rem" }}
                                        />
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button type="submit" style={{ margin: 0, width: "auto", padding: "5px 10px", fontSize: "0.82rem" }}>
                                                {editingAnnotationId ? "Update" : "Save"}
                                            </button>
                                            {editingAnnotationId && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAnnotation(editingAnnotationId)}
                                                    style={{ margin: 0, width: "auto", padding: "5px 10px", fontSize: "0.82rem", background: "var(--danger-soft)", border: "1px solid var(--danger-border)", color: "var(--danger-text)" }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAnnotationRegionId(null);
                                                    setEditingAnnotationId(null);
                                                }}
                                                style={{ margin: 0, width: "auto", padding: "5px 10px", fontSize: "0.82rem", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <form onSubmit={(e) => handleAddRegionTag(e, region.id)} style={{ display: "flex", gap: 6 }}>
                                    <input
                                        value={newRegionTag}
                                        onChange={(e) => setNewRegionTag(e.target.value)}
                                        placeholder="Tag this region…"
                                        style={{ flex: 1, margin: 0, padding: "5px 8px", fontSize: "0.82rem" }}
                                    />
                                    <button type="submit" style={{ margin: 0, width: "auto", padding: "5px 10px", fontSize: "0.82rem" }}>
                                        +Tag
                                    </button>
                                </form>
                            </section>
                        );
                    })()}

                    {/* Annotation side panel list */}
                    <section style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                        <h4 style={{ margin: 0, fontSize: "0.92rem" }}>Annotations (Page {currentPage})</h4>
                        {currentPageAnnotations.length === 0 && (
                            <p className="muted-text" style={{ marginTop: 8 }}>No annotations on this page.</p>
                        )}
                        {currentPageAnnotations.map((annotation) => (
                            <article
                                key={annotation.id}
                                className="region-card"
                                style={{ borderLeft: "3px solid var(--accent-alt)", marginTop: 8, cursor: "pointer" }}
                                onClick={() => {
                                    setActiveRegionId(annotation.region);
                                    setAnnotationRegionId(annotation.region);
                                    setEditingAnnotationId(annotation.id);
                                    setAnnotationCategory(annotation.category || "Note");
                                    setAnnotationNote(annotation.note || "");
                                    setAnnotationCustomTag(annotation.custom_tag?.name || "");
                                    setTimeout(() => {
                                        regionRefs.current[annotation.region]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    }, 50);
                                }}
                            >
                                <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--accent-alt)", fontWeight: 700 }}>
                                    {annotation.category}
                                    {annotation.custom_tag?.name ? ` · #${annotation.custom_tag.name}` : ""}
                                </p>
                                <p style={{ margin: "6px 0 0", fontSize: "0.82rem" }}>{annotation.note || "No note"}</p>
                            </article>
                        ))}
                    </section>
                </div>
            </div>
        </section>
    );
}


export default DocumentViewerPage;
