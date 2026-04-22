import { z, ZodSchema } from "zod";

export class DropValidation {
  public static createSchema: ZodSchema = z.object({
    body: z.object({
      name: z.string({
        message: "Drop name is required",
      }).min(1, "Drop name is required"),
      price: z.coerce
        .number({
          message: "Price is required",
        })
        .int("Price must be an integer")
        .positive("Price must be greater than 0"),
      total_stock: z.coerce
        .number({
          message: "Total stock is required",
        })
        .int("Total stock must be an integer")
        .positive("Total stock must be greater than 0"),
      start_time: z.string({
        message: "Start time is required",
      }).datetime({ message: "Start time must be a valid ISO datetime" }),
    }),
  });
}
