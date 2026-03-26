const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const deriveStudentAccountName = (email: string): string => {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail.length === 0) {
    return "student";
  }

  const [localPart] = normalizedEmail.split("@");

  return localPart?.trim().length ? localPart.trim() : normalizedEmail;
};
