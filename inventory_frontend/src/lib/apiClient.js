import axios from "axios";
import { BASE_URL } from "../utils/baseURL";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
