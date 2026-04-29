// Admin API helper functions.
import api from "./api";


export async function getAdminSummary() {
    const response = await api.get("/admin/summary/");
    return response.data;
}


export async function getAdminUsers() {
    const response = await api.get("/admin/users/");
    return response.data;
}
