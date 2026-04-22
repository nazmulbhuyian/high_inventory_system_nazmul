import { apiClient } from "./apiClient";

export async function fetchDrops() {
  const response = await apiClient.get("/drops");
  return response.data?.data ?? [];
}

export async function reserveDrop({ userId, dropId }) {
  const response = await apiClient.post("/reserve", { userId, dropId });
  return response.data?.data;
}

export async function purchaseDrop({ userId, dropId }) {
  const response = await apiClient.post("/purchase", { userId, dropId });
  return response.data?.data;
}

export async function createDrop({ name, price, total_stock, start_time }) {
  const response = await apiClient.post("/drops", {
    name,
    price,
    total_stock,
    start_time,
  });
  return response.data?.data;
}
