import { Response } from "express";

type IApiResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string | null;
  data?: T | null;
  totalData?: number;
};

export class ResponseHelper {
  public sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
    const responseData: IApiResponse<T> | any = {
      statusCode: data.statusCode,
      success: data.success,
      message: data.message || null,
      data: data.data ?? null,
      totalData: data.totalData ?? undefined,
    };

    res.status(data.statusCode).json(responseData);
  };
}
