import axios from "axios";

//There is no localhost in production. So we have to make this dynamic
const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api" : "/api"
const api = axios.create({
    baseURL: BASE_URL,
})

export default api