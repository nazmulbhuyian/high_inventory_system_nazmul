// middlewares/customCors.ts
import { Request, Response, NextFunction } from "express";

export class CustomCors {
  private allowedPrivateDomains: string[];

  constructor() {
    this.allowedPrivateDomains = [
      "https://classic.com",
      "http://localhost:3001",
    ];
  }

  public handle = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    if (req.method === "OPTIONS" && req.originalUrl.startsWith("/api")) {
      res.header("Access-Control-Allow-Origin", origin || "*");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS"
      );
      res.sendStatus(204);
      return;
    }

    if (req.originalUrl.startsWith("/api")) {
      res.header("Access-Control-Allow-Origin", origin || "*");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS"
      );
      next();
      return;
    }

    const isLocalhostOrigin =
      origin != null && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (origin && (this.allowedPrivateDomains.includes(origin) || isLocalhostOrigin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS"
      );
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: "CORS policy does not allow access from this origin.",
    });
  };
}
