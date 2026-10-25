export const APP_NAME = "shareNcare";

export type HealthResponse = {
  ok: true;
  app: typeof APP_NAME;
  runtime: string;
  requestId: string;
};

export type ApiErrorCode = "NOT_FOUND" | "HTTP_ERROR" | "INTERNAL";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
};
