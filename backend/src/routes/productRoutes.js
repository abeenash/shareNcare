import express, { Router } from "express";
import { createProduct, getAllProducts } from "../controllers/productsController.js";

const router = express.Router();

router.get("/", getAllProducts);

router.post("/", createProduct);

export default router;