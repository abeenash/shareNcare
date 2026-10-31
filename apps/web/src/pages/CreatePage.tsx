import { NoteInputSchema } from "@sharencare/shared";
import { ArrowLeftIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import { useCreateNote } from "../note-queries";

const CreatePage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createNote = useCreateNote();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = NoteInputSchema.safeParse({ title, description });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Please check your note");
      return;
    }

    createNote.mutate(result.data, {
      onSuccess: () => {
        toast.success("Your note has been created!");
        navigate("/");
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="w-full">
        <div className="max-w-2xl mx-auto ">
          <Link to={"/"} className="btn btn-ghost mb-6">
            <ArrowLeftIcon className="size-5" />
            Back to Notes
          </Link>

          <div className="card bg-base-200 rounded-3xl">
            <div className="card-body m-2">
              <h2 className="card-title text-2xl mb-4">Create New Note</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-control mb-4">
                  <label className="label" htmlFor="title">
                    <span className="text-base-content/70">Title</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Note Title"
                    className="block input input-bordered rounded-xl mt-1 bg-base-100"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-control mb-4">
                  <label className="label" htmlFor="description">
                    <span className="text-base-content/70">Description</span>
                  </label>
                  <textarea
                    placeholder="Write your note here..."
                    className="block textarea textarea-bordered h-32 rounded-2xl mt-1 bg-base-100"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="card-actions justify-end">
                  <button type="submit" className="btn btn-primary" disabled={createNote.isPending}>
                    {createNote.isPending ? "Creating..." : "Create Note"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
