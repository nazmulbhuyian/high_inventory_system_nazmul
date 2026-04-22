// index.ts
import express, { Application, NextFunction, Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import httpStatus from "http-status";
import rateLimit from "express-rate-limit";
import { Routes } from "./routes/routes.js";
import { CustomCors } from "./middlewares/customCors.js";
import { GlobalErrorHandler } from "./middlewares/global.error.handler.js";
import { initSocketIO } from "./shared/socket.js";

export class App {
  public app: Application;
  public server: http.Server;
  public io: Server;

  private routes = new Routes();
  private customCors = new CustomCors();
  private globalErrorHandler = new GlobalErrorHandler();

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);

    // ✅ socket init
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    initSocketIO(this.io);

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketEvents();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    this.app.use((req, res, next) =>
      this.customCors.handle(req, res, next)
    );
  }

  private initializeRoutes(): void {
    this.app.get("/", (_req, res) => {
      res.send("🚀 Server is running with Socket.IO");
    });

    this.app.use("/api", this.routes.router);
  }

  private initializeSocketEvents(): void {
    this.io.on("connection", (socket) => {
      console.log("🟢 Socket connected:", socket.id);

      socket.on("join-project", (user_id: string) => {
        const room = `project-room:${user_id}`;
        socket.join(room);
        console.log(`🏪 Joined ${room}`);
      });

      socket.on("disconnect", () => {
        console.log("🔴 Socket disconnected:", socket.id);
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(
      (err: any, req: Request, _res: Response, next: NextFunction) => {
        console.log(`❌ Error: ${req.method} ${req.originalUrl} - ${err.message}`);
        next(err);
      }
    );

    this.app.use(this.globalErrorHandler.handle);

    this.app.use((req: Request, res: Response) => {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "API Not Found",
      });
    });
  }
}