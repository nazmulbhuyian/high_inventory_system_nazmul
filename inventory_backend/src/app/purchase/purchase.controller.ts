import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync.js";
import { PurchaseService } from "./purchase.service.js";
import { ResponseHelper } from "../../shared/sendResponse.js";

export class PurchaseController {

    private purchaseService = new PurchaseService();
    private responseHelper = new ResponseHelper();

    createPurchase = catchAsync(async (req: Request, res: Response) => {
        const result = await this.purchaseService.createPurchase(req.body);

        this.responseHelper.sendResponse(res, {
            statusCode: httpStatus.CREATED,
            success: true,
            message: "Purchase completed successfully",
            data: result,
        });
    });
}
