// Document API helper functions used by React pages.
import api from "./api";


export async function uploadDocument(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/upload/", formData);
    return response.data;
}


export async function getDocuments() {
    const response = await api.get("/documents/");
    return response.data;
}


export async function getDocumentById(id) {
    const response = await api.get(`/documents/${id}/`);
    return response.data;
}


export async function searchDocuments(query) {
    const response = await api.get("/search/", {
        params: { q: query },
    });
    return response.data;
}


export async function getDashboardStats() {
    const response = await api.get("/dashboard/");
    return response.data;
}
