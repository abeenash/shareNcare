export type CodeKind = "email-verification" | "forget-password" | "sign-in" | "change-email";

export function codeEmail(kind: CodeKind, code: string, minutes: number) {
  if (kind === "forget-password") {
    return {
      subject: `${code} is your shareNcare password reset code`,
      text: [
        `Someone asked to reset the password for this shareNcare account.`,
        ``,
        `Your code: ${code}`,
        ``,
        `It works for ${minutes} minutes. If that wasn't you, ignore this email:`,
        `your password stays exactly as it is.`,
      ].join("\n"),
    };
  }
  return {
    subject: `${code} is your shareNcare code`,
    text: [
      `Welcome to shareNcare. Type this code to confirm your email:`,
      ``,
      `${code}`,
      ``,
      `It works for ${minutes} minutes. If you didn't sign up, you can ignore this email.`,
    ].join("\n"),
  };
}
