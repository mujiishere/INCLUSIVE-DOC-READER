// Auth helper functions for API calls and localStorage token handling.
import api from "./api";


export async function registerUser(payload) {
    const response = await api.post("/register/", payload);
    return response.data;
}


export async function loginUser(payload) {
    const response = await api.post("/login/", payload);
    return response.data;
}


export async function getCurrentUser() {
    const response = await api.get("/me/");
    return response.data;
}


export function saveToken(token) {
    localStorage.setItem("token", token);
}


export function getToken() {
    return localStorage.getItem("token");
}


export function clearToken() {
    localStorage.removeItem("token");
}
