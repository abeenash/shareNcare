import express from 'express'
import cors from 'cors';
import dotenv from "dotenv";
import notesRoutes from './routes/notesRoutes.js'
import productRoutes from './routes/productRoutes.js'
import { connectDB } from './config/db.js';
import rateLimiter from './middleware/rateLimiter.js';

dotenv.config();

const app = express();

//middleware
app.use(express.json());
app.use(
    cors({
        origin: "http://localhost:5173",
    })
);
app.use(rateLimiter);


app.use("/api/notes", notesRoutes);
app.use("/api/products", productRoutes);

connectDB().then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    });
});