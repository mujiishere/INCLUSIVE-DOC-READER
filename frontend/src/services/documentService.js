// Document API helper functions — full platform version.
import api from "./api";


// ── Upload ────────────────────────────────────────────────────────────────

export async function uploadDocument(file, title = "", onProgress = null) {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    const response = await api.post("/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
            if (onProgress && evt.total) {
                onProgress(Math.round((evt.loaded / evt.total) * 100));
            }
        },
    });
    return response.data;
}


// ── Document list / detail / delete ──────────────────────────────────────

export async function getDocuments() {
    const response = await api.get("/documents/");
    return response.data;
}

export async function getDocumentsWithFilters({ tag = "", tagIds = "" } = {}) {
    const params = {};
    if (tag) {
        params.tag = tag;
    }
    if (tagIds) {
        params.tag_ids = tagIds;
    }

    const response = await api.get("/documents/", { params });
    return response.data;
}

export async function getDocumentById(id) {
    const response = await api.get(`/documents/${id}/`);
    return response.data;
}

export async function deleteDocument(id) {
    await api.delete(`/documents/${id}/`);
}


// ── Status polling ────────────────────────────────────────────────────────

export async function getDocumentStatus(id) {
    const response = await api.get(`/documents/${id}/status/`);
    return response.data;
}


// ── Pages ─────────────────────────────────────────────────────────────────

export async function getDocumentPages(id) {
    const response = await api.get(`/documents/${id}/pages/`);
    return response.data;
}

export async function getPageDetail(docId, pageNumber) {
    const response = await api.get(`/documents/${docId}/pages/${pageNumber}/`);
    return response.data;
}


// ── Tags ──────────────────────────────────────────────────────────────────

export async function addDocumentTag(docId, name) {
    const response = await api.post(`/documents/${docId}/tags/`, { name });
    return response.data;
}

export async function removeDocumentTag(docId, tagId) {
    await api.delete(`/documents/${docId}/tags/${tagId}/`);
}

export async function addRegionTag(regionId, name) {
    const response = await api.post(`/regions/${regionId}/tags/`, { name });
    return response.data;
}

export async function removeRegionTag(regionId, tagId) {
    await api.delete(`/regions/${regionId}/tags/${tagId}/`);
}


// ── Annotation ────────────────────────────────────────────────────────────

export async function annotateRegion(regionId, annotation) {
    const response = await api.post(`/regions/${regionId}/annotations/`, {
        category: "Note",
        note: annotation,
    });
    return response.data;
}


export async function createRegionAnnotation(regionId, payload) {
    const response = await api.post(`/regions/${regionId}/annotations/`, payload);
    return response.data;
}


export async function updateRegionAnnotation(annotationId, payload) {
    const response = await api.patch(`/annotations/${annotationId}/`, payload);
    return response.data;
}


export async function deleteRegionAnnotation(annotationId) {
    await api.delete(`/annotations/${annotationId}/`);
}


export async function getDocumentAnnotations(docId) {
    const response = await api.get(`/documents/${docId}/annotations/`);
    return response.data;
}


// ── Search ────────────────────────────────────────────────────────────────

export async function searchDocuments(query = "", lang = "", tag = "") {
    const response = await api.get("/search/", { params: { q: query, lang, tag } });
    return response.data;
}


// ── Export ────────────────────────────────────────────────────────────────

export function getExportUrl(docId, format = "txt") {
    const base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
    const token = localStorage.getItem("token");
    // Return a URL the browser can open directly; token appended for auth via query param
    // (backend handles Token auth via header; for file download we open in new tab)
    return `${base}/documents/${docId}/export/?format=${format}`;
}

export async function exportDocument(docId, format = "txt") {
    const response = await api.get(`/documents/${docId}/export/`, {
        params: { format },
        responseType: "blob",
    });
    return response;
}


// ── Dashboard ─────────────────────────────────────────────────────────────

export async function getDashboardStats() {
    const response = await api.get("/dashboard/");
    return response.data;
}
