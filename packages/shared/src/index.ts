export const APP_NAME = "shareNcare";

export type HealthResponse = {
  ok: true;
  app: typeof APP_NAME;
  runtime: string;
};
