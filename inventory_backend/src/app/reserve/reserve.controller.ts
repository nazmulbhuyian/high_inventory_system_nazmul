import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync.js";
import { ReserveService } from "./reserve.service.js";
import { ResponseHelper } from "../../shared/sendResponse.js";

export class ReserveController {

    private reserveService = new ReserveService();
    private responseHelper = new ResponseHelper();

    createReservation = catchAsync(async (req: Request, res: Response) => {
        const result = await this.reserveService.createReservation(req.body);

        this.responseHelper.sendResponse(res, {
            statusCode: httpStatus.CREATED,
            success: true,
            message: "Reservation created successfully",
            data: result,
        });
    });
}

