import { NextFunction, Request, RequestHandler, Response } from "express";

export class AsyncHandler {
  public static catch(fn: RequestHandler): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }
}

const catchAsync = AsyncHandler.catch;
export default catchAsync;
