import express, { Router } from "express";
import { PurchaseController } from "./purchase.controller.js";
import { PurchaseValidation } from "./purchase.validation.js";
import { ValidateRequest } from "../../middlewares/validateRequest.js";

export class PurchaseRoutes {
  public router: Router;
  private controller = new PurchaseController();
  private validateCreate = new ValidateRequest(PurchaseValidation.createSchema);

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/", this.validateCreate.validate, this.controller.createPurchase);
  }
}
