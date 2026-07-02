import axios from "axios";
import { networkConfig } from "@/config/network";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const apiUrl = networkConfig.coordinatorApiUrl;

if (!apiUrl) {
  throw new Error("Coordinator API URL is not defined.");
}

const coordinatorClient = axios.create({ baseURL: `${apiUrl}/api` });

coordinatorClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error ?? error.message;
      const status = error.response?.status ?? 0;
      return Promise.reject(new ApiError(message, status));
    }
    return Promise.reject(error);
  },
);

export default coordinatorClient;
