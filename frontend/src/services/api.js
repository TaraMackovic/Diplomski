import axios from "axios";

const api = axios.create({
    baseURL:"http://localhost:8000"
});

api.interceptors.request.use((config)=>{
    const token = localStorage.getItem("access_token");
    if(token && !config.url.includes("/login/")){
        config.headers.Authorization =`Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("is_staff");

            window.dispatchEvent(new Event("unauthorized"));
        }
        return Promise.reject(error);
    }
);

export default api;