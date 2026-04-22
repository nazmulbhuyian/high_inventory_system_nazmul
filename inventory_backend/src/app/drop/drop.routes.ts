import express, { Router } from "express";
import { DropController } from "./drop.controller.js";
import { DropValidation } from "./drop.validation.js";
import { ValidateRequest } from "../../middlewares/validateRequest.js";

export class DropRoutes {
  public router: Router;
  private controller = new DropController();
  private validateCreate = new ValidateRequest(DropValidation.createSchema);

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router
      .route("/")
      .get(this.controller.getAll)
      .post(this.validateCreate.validate, this.controller.create);
  }
}
