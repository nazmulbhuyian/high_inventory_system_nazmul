import express, { Router } from "express";
import { ReserveController } from "./reserve.controller.js";
import { ReserveValidation } from "./reserve.validation.js";
import { ValidateRequest } from "../../middlewares/validateRequest.js";

export class ReserveRoutes {
  public router: Router;
  private controller = new ReserveController();
  private validateCreate = new ValidateRequest(ReserveValidation.createSchema);

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/", this.validateCreate.validate, this.controller.createReservation);
  }
}
