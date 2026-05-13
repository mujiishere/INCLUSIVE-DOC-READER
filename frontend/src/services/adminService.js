// Admin API helper functions.
import api from "./api";


export async function getAdminSummary() {
    const response = await api.get("/admin/summary/");
    return response.data;
}


export async function getAdminUsers(query = "") {
    const params = {};
    if (query.trim()) {
        params.q = query.trim();
    }

    const response = await api.get("/admin/users/", { params });
    return response.data;
}

export async function createUser(data) {
    const response = await api.post("/admin/users/", data);
    return response.data;
}

export async function updateUser(data) {
    const response = await api.put("/admin/users/", data);
    return response.data;
}

export async function deleteUser(id) {
    const response = await api.delete("/admin/users/", { data: { id } });
    return response.data;
}
