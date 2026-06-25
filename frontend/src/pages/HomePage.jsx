import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import RateLimitUI from '../components/RateLimitUI';
import NoteCard from '../components/NoteCard';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import NotesNotFound from '../components/NotesNotFound';
import Loader from '../components/Loader';

const HomePage = () => {
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [notes, setNotes] = useState([]);
    const [isLoading, setisLoading] = useState(true);

    useEffect(() => {
        const getNotes = async () => {
            try {
                const res = await api.get("/notes");
                setNotes(res.data);
                setIsRateLimited(false);
            } catch (error) {
                console.log(error);
                if (error.response?.status === 429) {
                    setIsRateLimited(true);
                } else {
                    toast.error("Error fetching notes");
                }
            } finally {
                setisLoading(false);
            }
        }
        getNotes();
    }, [])

    return (
        <div className='min-h-screen'>
            <Navbar />
            {isRateLimited && <RateLimitUI />}

            <div className='max-w-7xl mx-auto p-4 mt-6'>
                {isLoading &&
                    <div className='text-center text-primary py-10'>
                        <Loader />
                    </div>}

                {notes.length === 0 && !isRateLimited && <NotesNotFound />}

                {notes.length > 0 && !isRateLimited && (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {
                            notes.map((note) => (
                                <div>
                                    <NoteCard key={note._id} note={note} setNote={setNotes} />
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        </div>

    )
}

export default HomePage