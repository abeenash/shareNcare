import express, { Router } from 'express';
import { createNote, deleteNote, getAllNotes, getNoteById, updateNote } from '../controllers/notesController.js';

const router = express.Router()

//for now, this is all for notes
router.get("/", getAllNotes);
router.post("/", createNote);
router.get("/:id",getNoteById);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

//later in the future, if I want to add let's say product, or post, or payment, or email, then just do it the same way.
export default router;