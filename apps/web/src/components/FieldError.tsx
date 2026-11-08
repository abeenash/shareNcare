import type { AnyFieldMeta } from "@tanstack/react-form";

// Shows a field's first problem, but only after the person has used that field
// (or pressed submit). Nobody likes red text before they have typed anything.
const FieldError = ({ meta }: { meta: AnyFieldMeta }) => {
  if (!meta.isTouched) return null;
  const [first] = meta.errors;
  if (!first) return null;

  const message = typeof first === "string" ? first : first.message;
  return (
    <p role="alert" className="mt-1 text-sm text-error">
      {message}
    </p>
  );
};

export default FieldError;
