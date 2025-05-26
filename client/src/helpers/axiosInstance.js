import axios from "axios";

const BASE_URL = "https://35-154-255-213.nip.io/api/v1";

const axiosInstance = axios.create();

axiosInstance.defaults.baseURL = BASE_URL;
axiosInstance.defaults.withCredentials = true;

export default axiosInstance;
