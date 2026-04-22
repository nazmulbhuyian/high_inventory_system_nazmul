import { z, ZodSchema } from "zod";

export class ReserveValidation {
  public static createSchema: ZodSchema = z.object({
    body: z.object({
      userId: z.coerce
        .number({ message: "userId is required" })
        .int("userId must be an integer")
        .positive("userId must be greater than 0"),
      dropId: z.coerce
        .number({ message: "dropId is required" })
        .int("dropId must be an integer")
        .positive("dropId must be greater than 0"),
    }),
  });
}
