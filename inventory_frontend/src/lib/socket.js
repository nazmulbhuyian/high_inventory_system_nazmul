import { io } from "socket.io-client";
import { SOCKET_URL } from "../utils/baseURL";

let socketInstance = null;

export function getInventorySocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
    });
  }

  return socketInstance;
}

export function connectInventorySocket() {
  const socket = getInventorySocket();

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}
