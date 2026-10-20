import express from 'express'
import cors from 'cors';
import dotenv from "dotenv";
import notesRoutes from './routes/notesRoutes.js'
import { connectDB } from './config/db.js';
import rateLimiter from './middleware/rateLimiter.js';
import path from 'path';
import swaggerUi from "swagger-ui-express"
import swaggerJsdoc from 'swagger-jsdoc'

dotenv.config();

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Notes API",
            version: "1.0.0",
            description: "Simple Notes API built with Express and MongoDB",
        },
        servers: [
            {
                url: "http://localhost:5000",
            },
        ],
        components: {
            schemas: {
                Note: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            example: "687c67asd1293abcde34"
                        },
                        title: {
                            type: "string",
                            example: "Learn Swagger"
                        },
                        description: {
                            type: "string",
                            example: "Practice documenting my Notes API"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                        },
                    },
                },
                CreateNoteRequest: {
                    type: "object",
                    required: [
                        "title",
                        "description",
                    ],
                    properties: {
                        title: {
                            type: "string",
                            example: "Learn Swagger",
                        },
                        description: {
                            type: "string",
                            example: "Practice documenting APIs"
                        },
                    }
                }
            },
        },
    },
    apis: ["./src/routes/*.js"],
}

const swaggerSpec = swaggerJsdoc(options)

const app = express();
const __dirname = path.resolve()

if (process.env.NODE_ENV !== "production") {
    app.use(
        cors({
            origin: "http://localhost:5173",
        })
    );
}
//middleware
app.use(express.json());

app.use(rateLimiter);

app.use("/api/notes", notesRoutes);

app.use("/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
)

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
    })
}

connectDB().then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    });
});