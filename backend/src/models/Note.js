import mongoose from "mongoose";

//1. create a schema
//2. Create a model based off of that schema

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
}, { timestamps: true });

const Note = mongoose.model("Note", noteSchema);

export default Note