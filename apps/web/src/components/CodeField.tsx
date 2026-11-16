type CodeFieldProps = {
  value: string;
  onChange: (code: string) => void;
};

const CodeField = ({ value, onChange }: CodeFieldProps) => (
  <label className="form-control" htmlFor="code">
    <span className="label text-base-content/70">6-digit code</span>
    <input
      id="code"
      className="input input-bordered rounded-xl bg-base-100 w-full text-center font-mono text-2xl tracking-[0.5em]"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      required
    />
  </label>
);

export default CodeField;
