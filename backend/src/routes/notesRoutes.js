import express, { Router } from 'express';
import { createNote, deleteNote, getAllNotes, getNoteById, updateNote } from '../controllers/notesController.js';

const router = express.Router()

//for now, this is all for notes
/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Get all notes
 *     description: Returns all notes sorted by newest first.
 *     tags:
 *       - Notes
 *     responses:
 *       200:
 *         description: Successfully retrieved all notes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 *       500:
 *         description: Internal Server Error.
 */
router.get("/", getAllNotes);

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a new note
 *     description: Creates a new note and stores it in MongoDB.
 *     tags:
 *       - Notes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNoteRequest'
 *     responses:
 *       201:
 *         description: Note created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       500:
 *         description: Internal Server Error.
 */
router.post("/", createNote);

/**
 * @swagger
 * /api/notes/{id}:
 *   get:
 *     summary: Get a note by ID
 *     tags:
 *       - Notes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB Note ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved note.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Note not found
 */
router.get("/:id",getNoteById);

/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Update a note
 *     tags:
 *       - Notes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateNoteRequest'
 *     responses:
 *       200:
 *         description: Note updated successfully.
 *         content: 
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Note not found.
 */
router.put("/:id", updateNote);

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete a note
 *     tags:
 *       - Notes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       404:
 *         description: Note not found
 */
router.delete("/:id", deleteNote);

//later in the future, if I want to add let's say product, or post, or payment, or email, then just do it the same way.
export default router;