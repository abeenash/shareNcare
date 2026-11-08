import { BoardInputSchema } from "@sharencare/shared";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "react-router";
import { useCreateBoard } from "../board-queries";
import FieldError from "./FieldError";

const NewBoardForm = () => {
  const createBoard = useCreateBoard();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { title: "", recipient: "" },
    validators: { onChange: BoardInputSchema },
    onSubmit: async ({ value }) => {
      try {
        const board = await createBoard.mutateAsync(value);
        navigate(`/boards/${board.id}`);
      } catch {
        // the hook already showed the error
      }
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="card border border-base-content/10 bg-base-200"
    >
      <div className="card-body gap-4 p-6 md:p-8">
        <h2 className="font-serif text-2xl">Start a board</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="title">
            {(field) => (
              <div>
                <label htmlFor="board-title" className="mb-1 block text-sm text-base-content/70">
                  Title
                </label>
                <input
                  id="board-title"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Farewell, Didi"
                  maxLength={80}
                  autoComplete="off"
                  className="input w-full bg-base-100"
                />
                <FieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
          <form.Field name="recipient">
            {(field) => (
              <div>
                <label
                  htmlFor="board-recipient"
                  className="mb-1 block text-sm text-base-content/70"
                >
                  Who is it for?
                </label>
                <input
                  id="board-recipient"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Didi"
                  maxLength={60}
                  autoComplete="off"
                  className="input w-full bg-base-100"
                />
                <FieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
        </div>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <button type="submit" className="btn btn-primary self-start" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create board"}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};

export default NewBoardForm;
