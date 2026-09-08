export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: "At least 8 characters (max 72)",
    test: (p: string) => p.length >= 8 && p.length <= 72,
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter",
    test: (p: string) => /(?=.*[a-z])/.test(p),
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter",
    test: (p: string) => /(?=.*[A-Z])/.test(p),
  },
  {
    id: "number",
    label: "At least one number",
    test: (p: string) => /(?=.*\d)/.test(p),
  },
];

export const getPasswordRequirementStatuses = (password: string) => {
  return PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.test(password || ""),
  }));
};

export const validatePassword = (
  password: string
): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  const safePassword = password || "";

  if (safePassword.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else if (safePassword.length > 72) {
    errors.push("Password cannot be longer than 72 characters");
  }

  if (!/(?=.*[a-z])/.test(safePassword)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/(?=.*[A-Z])/.test(safePassword)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/(?=.*\d)/.test(safePassword)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// errorMessages
export const getAuthErrorMessage = (error: any): string => {
  if (!error) return "Invalid email or password";

  const rawMessage =
    error?.message || (typeof error === "string" ? error : error?.toString() || "");

  // Detect raw database / backend / schema errors
  const isRawInternalError =
    /database|schema|postgres|relation|pg_|constraint|foreign key|syntax error|internal server|column|500/i.test(
      rawMessage
    );

  if (isRawInternalError) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  // Map common Supabase auth errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    "Invalid login credentials": "Invalid email or password",
    "invalid_credentials": "Invalid email or password",
    "Email not confirmed":
      "Please check your email and click the confirmation link",
    "email_not_confirmed":
      "Please check your email and click the confirmation link",
    "User already registered": "An account with this email already exists",
    "user_already_exists": "An account with this email already exists",
    "Password should be at least 6 characters":
      "Password must be at least 6 characters long",
    "Unable to validate email address: invalid format":
      "Please enter a valid email address",
    "Signup requires a valid password": "Please enter a valid password",
    "Email rate limit exceeded": "Too many attempts. Please try again in a few minutes.",
    "over_email_send_rate_limit": "Too many attempts. Please try again in a few minutes.",
    "User not found": "Invalid email or password",
  };

  if (errorMappings[rawMessage]) {
    return errorMappings[rawMessage];
  }

  // Fallback to safe message if it's unknown or contains exception phrasing
  if (!rawMessage || rawMessage.includes("Error") || rawMessage.includes("Exception") || rawMessage.length > 100) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  return rawMessage;
};
