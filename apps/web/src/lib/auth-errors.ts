const messages: Record<string, string> = {
  INVALID_OTP: "That code isn't right. Check the email and try again.",
  OTP_EXPIRED: "The code has expired. Ask for a new code.",
  TOO_MANY_ATTEMPTS: "Too many wrong tries. Ask for a new code.",
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match.",
  PASSWORD_TOO_SHORT: "Your password needs at least 12 characters",
};

export function authErrorMessage(error: { code?: string; message?: string }): string {
  const friendly = error.code ? messages[error.code] : undefined;
  return friendly ?? error.message ?? "Something went wrong. Please try again.";
}
