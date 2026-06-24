import Product from "../models/Product.js";

export async function getAllProducts(_, res) {
    try {
        const fetchedProducts = await Product.find();
        res.status(200).json(fetchedProducts);
    } catch (error) {
        console.error("Failed to retrieve products. Possible error in getAllProducts controller.", error);
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export async function createProduct(req, res) {
    try {
        const { name, price, description } = req.body;
        const newProduct = new Product({ name, price, description });
        const savedProduct = await newProduct.save();
        res.status(201).json({ message: "Product has been created" });
    } catch (error) {
        console.error("Failed to create product. Possible error in createProduct controller.", error);
        res.status(500).json({ message: "Internal Server Error" })
    }
}