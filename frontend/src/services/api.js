// Shared Axios client configured with API base URL and token header.
import axios from "axios";


const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
});


// Convert backend errors into a simple message for UI display.
export function getApiErrorMessage(error) {
    if (error?.response?.data?.error) {
        return error.response.data.error;
    }

    if (error?.response?.data?.errors) {
        const firstKey = Object.keys(error.response.data.errors)[0];
        const firstValue = error.response.data.errors[firstKey];
        if (Array.isArray(firstValue) && firstValue.length > 0) {
            return String(firstValue[0]);
        }
        return "Please check your input values.";
    }

    if (error?.message) {
        return error.message;
    }

    return "Something went wrong. Please try again.";
}


export default api;
