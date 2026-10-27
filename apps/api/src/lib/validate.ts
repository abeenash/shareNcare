import { zValidator } from "@hono/zod-validator";
import type { ApiIssue } from "@sharencare/shared";
import type { ValidationTargets } from "hono";
import type { z } from "zod";

export class ValidationError extends Error {
  issues: ApiIssue[];

  constructor(issues: ApiIssue[]) {
    super("Validation failed");
    this.issues = issues;
  }
}

//Bouncer
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      throw new ValidationError(issues);
    }
  });
