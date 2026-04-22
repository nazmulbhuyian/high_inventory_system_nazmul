import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export class ValidateRequest {
  private schema: ZodSchema;

  constructor(schema: ZodSchema) {
    this.schema = schema;
  }

  public validate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
