import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const axiosInstance = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
});

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

axiosInstance.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // ======================================================
    // TOKEN EXPIRED
    // ======================================================

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken =
          localStorage.getItem("refreshToken");

        // ======================================================
        // REFRESH TOKEN API
        // ======================================================

        const response = await axios.post(
          `${backendUrl}/users/refresh-token`,
          {
            refreshToken,
          },
          {
            withCredentials: true,
          }
        );

        // ======================================================
        // GET NEW TOKENS
        // ======================================================

        const newAccessToken =
          response.data.accessToken;

        const newRefreshToken =
          response.data.refreshToken;

        // ======================================================
        // SAVE NEW TOKENS
        // ======================================================

        localStorage.setItem(
          "accessToken",
          newAccessToken
        );

        localStorage.setItem(
          "refreshToken",
          newRefreshToken
        );

        // ======================================================
        // RETRY ORIGINAL REQUEST
        // ======================================================

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return axiosInstance(originalRequest);

      } catch (refreshError) {

        // ======================================================
        // REFRESH FAILED -> LOGOUT
        // ======================================================

        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;