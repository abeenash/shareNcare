import type { AppType } from "@sharencare/api";
import { hc, type InferResponseType } from "hono/client";

export const api = hc<AppType>("/").api;

export type Note = InferResponseType<typeof api.notes.$get, 200>[number];
