import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import ApiError from "../errors/ApiError.js";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client.js";

export class GlobalErrorHandler {
  public handle = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
    let success = false;
    let message = err.message || "Something went wrong!";
    let errorMessages: { path: string; message: string }[] = [];

    if (err instanceof ZodError) {
      message = "Validation Error";
      statusCode = httpStatus.BAD_REQUEST;
      errorMessages = err?.issues?.map((e: any) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
    }

    // Prisma Validation Error (e.g. missing required field)
    else if (err instanceof Prisma.PrismaClientValidationError) {
      message = "Validation Error";
      statusCode = httpStatus.BAD_REQUEST;

      // Split the error message and match multiple "Argument `title` is missing."
      const matches = err.message.matchAll(/Argument `(\w+)` is missing/g);

      // Iterate over all matches and create error messages for each missing field
      for (const match of matches) {
        const missingField = match[1]!;
        errorMessages.push({
          path: missingField,
          message: `Path ${missingField} is required.`,
        });
      }

      // If no matches found, push a default error message
      if (errorMessages.length === 0) {
        errorMessages.push({
          path: "",
          message: "Invalid data format sent to database.",
        });
      }
    }

    // Prisma Unique Constraint Error (P2002 - Duplicate values)
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        statusCode = 400;
        message = "An operation failed because it depends on one or more records that were required but not found.";
      }
      else if (err.code === "P2002") {
        message = "Duplicate Field Error";

        // Handling multiple fields in the unique constraint error
        const targets = Array.isArray(err.meta?.target)
          ? err.meta.target
          : [err.meta?.target];
        targets?.forEach((target: any) => {
          errorMessages.push({
            path: Array.isArray(target) ? target.join(", ") : target,
            message: `Duplicate value for unique field(s): ${Array.isArray(target) ? target.join(", ") : target
              }`,
          });
        });

        statusCode = httpStatus.CONFLICT;
      }
      else if (err.code === "P2003") {
        statusCode = 400;
        message = "Foreign key constraint failed"
      }
    }

    else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
      statusCode = 500;
      message = "Error occurred during query execution"
    }

    else if (err instanceof Prisma.PrismaClientInitializationError) {
      if (err.errorCode === "P1000") {
        statusCode = 401;
        message = "Authentication failed. Please check your creditials!"
      }
      else if (err.errorCode === "P1001") {
        statusCode = 400;
        message = "Can't reach database server"
      }
    }

    // Handle raw database query errors (PostgreSQL constraint violations)
    else if (err.code === "23503") {
      statusCode = 409;
      message = "Foreign key constraint violation";
      
      // Extract the constraint name from error message
      const constraintMatch = err.message?.match(/Key \((.*?)\)/);
      const fieldName = constraintMatch ? constraintMatch[1] : "referenced record";
      
      errorMessages.push({
        path: fieldName,
        message: `Cannot perform this operation. The ${fieldName} references a non-existent record.`,
      });
    }

    else if (err.code === "23505") {
      statusCode = 409;
      message = "Unique constraint violation";
      
      const constraintMatch = err.message?.match(/Key \((.*?)\)/);
      const fieldName = constraintMatch ? constraintMatch[1] : "field";
      
      errorMessages.push({
        path: fieldName,
        message: `This ${fieldName} already exists. Please use a different value.`,
      });
    }

    else if (err.code === "23502") {
      statusCode = 400;
      message = "NOT NULL constraint violation";
      
      const columnMatch = err.message?.match(/column "(.*?)"/);
      const columnName = columnMatch ? columnMatch[1] : "required field";
      
      errorMessages.push({
        path: columnName,
        message: `The field '${columnName}' is required and cannot be null.`,
      });
    }

    else if (err.code === "23514") {
      statusCode = 400;
      message = "Check constraint violation";
      
      const constraintMatch = err.message?.match(/"([^"]+)"/);
      const constraintName = constraintMatch ? constraintMatch[1] : "validation";
      
      errorMessages.push({
        path: constraintName,
        message: `Data validation failed. Value violates database constraints.`,
      });
    }

    // Handle custom ApiError
    else if (err instanceof ApiError) {
      message = err.message;
      statusCode = err.statusCode;
      errorMessages.push({
        path: "",
        message: err.message,
      });
    }

    // Handle regular errors like `new Error()`
    else if (err instanceof Error) {
      message = err.message;
      statusCode = httpStatus.BAD_REQUEST; // You can adjust the status code here if needed
      errorMessages.push({
        path: "",
        message: err.message,
      });
    }

    // Default fallback
    if (errorMessages.length === 0) {
      errorMessages.push({
        path: "",
        message: "Unexpected error occurred",
      });
    }

    res.status(statusCode).json({
      success,
      message,
      errorMessages,
    });
  };
}
