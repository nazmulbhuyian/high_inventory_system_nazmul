// server.ts
import "dotenv/config";
import { App } from "./index.js";
import { prisma } from "./lib/prisma.js";
import { reservationExpirationJob } from "./jobs/reservationExpiration.job.js";

class Database {
  public async connect(): Promise<void> {
    try {
      await prisma.$connect();
      console.log("✅ Database connected");
    } catch (err: any) {
      console.error(`❌ DB Error: ${err.message}`);
      process.exit(1);
    }
  }
}

class Main {
  private app: App;
  private database: Database;
  private port: number | string;

  constructor() {
    this.port = process.env.PORT || 8080;
    this.app = new App();
    this.database = new Database();
  }

  public async start(): Promise<void> {
    try {
      await this.database.connect();
      reservationExpirationJob.start();

      this.app.server.listen(this.port, () => {
        console.log(`🚀 Server running on port ${this.port}`);
      });

      this.handleErrors();
    } catch (error: any) {
      console.error(`❌ Server start failed: ${error.message}`);
      process.exit(1);
    }
  }

  private handleErrors() {
    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
      process.exit(1);
    });

    process.on("unhandledRejection", (err) => {
      console.error("Unhandled Rejection:", err);
      process.exit(1);
    });
  }
}

new Main().start();