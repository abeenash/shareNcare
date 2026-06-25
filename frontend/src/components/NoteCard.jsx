import { PenSquareIcon, Trash2Icon } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate } from '../lib/utils.js'
import api from '../lib/axios.js'
import toast from 'react-hot-toast'

const NoteCard = ({ note, setNote }) => {

    const handleDelete = async (e, id) => {
        e.preventDefault()
        if (!window.confirm("Are you sure you want to delete this note?")) return;

        try {
            await api.delete(`/notes/${id}`);
            toast.success("Your note has been deleted");
            setNote((prev) => prev.filter(note => note._id !== id))
        } catch (error) {
            console.log("Error in handleDelete", error);
            toast.error("Failed to delete the note");
        }
    }

    return (
        <Link to={`/note/${note._id}`}
            className="card bg-base-100 hover:shadow-lg transition-all 
            duration-200 border-t-4 border-solid border-[#0077B6]">

            <div className='card-body bg-gray-950 font-mono tracking-wide'>
                <h3 className='card-title text-base-content'>{note.title}</h3>
                <p className='text-base-content/70 line-clamp-3'>{note.description}</p>
                <div className='card-actions justify-between items-center mt-4'>
                    <span className='text-sm text-base-content/60'>
                        {formatDate(new Date(note.createdAt))}
                    </span>
                    <div className='flex items-center gap-2'>
                        <PenSquareIcon className='size-4' />
                        <button className='btn btn-ghost text-xs text-error'
                            onClick={(e) => handleDelete(e, note._id)}>
                            <Trash2Icon className='size-4' />
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    )
}

export default NoteCard