export * from "./notes";

export const APP_NAME = "shareNcare";

export type HealthResponse = {
  ok: true;
  app: typeof APP_NAME;
  runtime: string;
  requestId: string;
};

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "INTERNAL";

export type ApiIssue = { path: string; message: string };

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
    issues?: ApiIssue[];
  };
};
