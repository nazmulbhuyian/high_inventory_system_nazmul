// shared/socket.ts
import { Server } from "socket.io";

let socketServer: Server | null = null;

export interface IStockUpdatePayload {
  dropId: number;
  available_stock: number;
}

export const initSocketIO = (socketIO: Server) => {
  socketServer = socketIO;
};

export const getSocketIO = (): Server => {
  if (!socketServer) {
    throw new Error("❌ Socket.IO not initialized");
  }
  return socketServer;
};

// Reusable emitter used by reservation/purchase/job flows.
// It is intentionally safe: if socket is not initialized, API flow should not fail.
export const emitStockUpdate = (payload: IStockUpdatePayload): void => {
  try {
    // Global stock event consumed by dashboard clients.
    const socket = getSocketIO();
    socket.emit("stock_update", payload);
  } catch {
    // Ignore emit errors to keep business flow resilient.
  }
};
