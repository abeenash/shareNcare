import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router"
import api from "../lib/axios";
import toast from "react-hot-toast";
import Loader from "../components/Loader";

const NoteDetailPage = () => {
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        const getNote = async () => {
            try {
                const res = await api.get(`/notes/${id}`);
                setNote(res.data);
            } catch (error) {
                console.log("Error in fetching note.", error);
                toast.error("Failed to fetch the note");
            } finally {
                setLoading(false);
            }
        };
        getNote();
    }, [id])

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this note?")) return

        try {
            await api.delete(`/notes/${id}`);
            toast.success("Your note has been deleted.")
            navigate("/");
        } catch (error) {
            console.log("Error deleting the notes: ", error);
            toast.error("Failed to delete note.")
        }
    };

    const handleSave = async () => {
        if (!note.title.trim() || !note.description.trim()) {
            toast.error("You need to provide a title or a description.")
            return
        }
        setSaving(true)
        try {
            await api.put(`/notes/${id}`, note)
            toast.success("Your note has been updated")
            navigate("/")
        } catch (error) {
            console.log("Error saving the note", error);
            toast.error("Failed to update note")
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader />
            </div>

        )
    }

    return (
        <div className="min-h-screen bg-black">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto font-mono tracking-wide">
                    <div className="flex items-center justify-between mb-6">
                        <Link to={"/"} className="btn btn-ghost hover:bg-black">
                            <ArrowLeftIcon className="h-5 w-5" />
                            Back to Notes
                        </Link>
                        <button className="btn btn-ghost btn-outline btn-error" onClick={handleDelete}>
                            <Trash2Icon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="card bg-gray-950">
                        <div className="card-body">
                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="text-white font-light">Title</span>
                                </label>
                                <input type="text"
                                    placeholder="Note title"
                                    className="block mt-1 input bg-gray-900 input-bordered rounded-xl"
                                    value={note.title}
                                    onChange={(e) => setNote({
                                        ...note,
                                        title: e.target.value
                                    })}
                                />
                            </div>

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="text-white font-light">Description</span>
                                </label>
                                <textarea
                                    placeholder="Write your note here..."
                                    className="block mt-1 bg-gray-900 rounded-2xl textarea textare-bordered h-32"
                                    value={note.description}
                                    onChange={(e) => setNote({
                                        ...note,
                                        description: e.target.value
                                    })}
                                />

                            </div>

                            <div className="card-actions justify-end">
                                <button className="btn btn-primary" disabled={saving} onClick={handleSave} >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NoteDetailPage