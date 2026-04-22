import { Request, Response } from "express";
import httpStatus from "http-status";
import { DropService } from "./drop.service.js";
import catchAsync from "../../shared/catchAsync.js";
import { ResponseHelper } from "../../shared/sendResponse.js";

export class DropController {
    private dropService = new DropService();
    private responseHelper = new ResponseHelper();

    create = catchAsync(async (req: Request, res: Response) => {
        const result = await this.dropService.create(req.body);

        this.responseHelper.sendResponse(res, {
            statusCode: httpStatus.CREATED,
            success: true,
            message: "Drop created successfully",
            data: result,
        });
    });

    getAll = catchAsync(async (_req: Request, res: Response) => {
        const result = await this.dropService.getAll();

        this.responseHelper.sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Drops fetched successfully",
            data: result,
        });
    });
}
