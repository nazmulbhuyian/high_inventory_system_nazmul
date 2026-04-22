import express, { Router } from "express";
import { DropRoutes } from "../app/drop/drop.routes.js";
import { PurchaseRoutes } from "../app/purchase/purchase.routes.js";
import { ReserveRoutes } from "../app/reserve/reserve.routes.js";

export class Routes {
  public router: Router;

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.use("/drops", new DropRoutes().router);
    this.router.use("/reserve", new ReserveRoutes().router);
    this.router.use("/purchase", new PurchaseRoutes().router);
  }
}
