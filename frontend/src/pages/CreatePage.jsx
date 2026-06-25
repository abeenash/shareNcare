import { useState } from 'react'
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router';
import { ArrowLeftIcon, TriangleAlert } from 'lucide-react';

const CreatePage = () => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !description.trim()) {
            toast.error("You need to fill out the details properly!")
            return;
        }

        setLoading(true);
        try {
            await api.post("/notes", {
                title,
                description
            })
            toast.success("Your note has been created!")
            navigate("/");
        } catch (error) {
            console.error("Failed to create note", error);
            if (error.response.status === 429) {
                toast.error("Slow down! You're creating notes too fast", {
                    duration: 4000,
                    icon: "💀"
                })
            } else {
                toast.error("Failed to create note.")
            }
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="min-h-screen bg-black">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto font-mono tracking-wide">
                    <Link to={"/"} className="btn btn-ghost bg-black mb-6">
                        <ArrowLeftIcon className="size-5" />
                        Back to Notes
                    </Link>

                    <div className="card bg-gray-950 rounded-3xl">
                        <div className="card-body m-2">
                            <h2 className="card-title text-2xl mb-4">Create New Note</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-control mb-4">
                                    <label className="label">
                                        <span className="text-white font-light">Title</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Note Title"
                                        className="block input input-bordered rounded-xl mt-1 bg-gray-900"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="form-control mb-4">
                                    <label className="label">
                                        <span className="text-white font-light">Description</span>
                                    </label>
                                    <textarea
                                        placeholder="Write your note here..."
                                        className="block textarea textarea-bordered h-32 rounded-2xl mt-1 bg-gray-900"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                <div className="card-actions justify-end">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? "Creating..." : "Create Note"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreatePage