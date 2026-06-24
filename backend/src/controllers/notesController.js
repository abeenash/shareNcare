import Note from "../models/Note.js";

export async function getAllNotes(_, res) {
    try {
        const notes = await Note.find().sort({ createdAt: -1 });
        res.status(200).json(notes);
    } catch (error) {
        console.error("Error in getAllNotes controller", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getNoteById(req, res) {
    try {
        const noteOfId = await Note.findById(req.params.id);

        if (!noteOfId) {
            return res.status(404).json({ message: "Note not found of that id." });
        }
        res.status(200).json(noteOfId);
    } catch (error) {
        console.error("Error in getAllNotes controller", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function createNote(req, res) {
    try {
        const { title, description } = req.body;
        const newNote = new Note({ title, description });
        const savedNote = await newNote.save();
        res.status(201).json(savedNote);
        //instead of res.status(201).json({message:"Note has been created"})
    } catch (error) {
        console.error("Failed to create note. Probably error in createNote controller", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function updateNote(req, res) {
    try {
        const { title, description } = req.body;
        const updatedNote = await Note.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description
            },
            { new: true }
        );
        if (!updatedNote) {
            return res.status(404).json({ message: "Note not found" });
        }
        res.status(200).json(updatedNote);
    } catch (error) {
        console.error("Failed to update the note. Probably error in updateNotes controller.", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function deleteNote(req, res) {
    try {
        const deletedNote = await Note.findByIdAndDelete(req.params.id);

        if (!deletedNote) {
            return res.status(404).json({ message: "Cannot find the note to be deleted" });
        }
        res.status(200).json({ message: "Note has been deleted" });
    } catch (error) {
        console.error("Failed to delete the note", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}