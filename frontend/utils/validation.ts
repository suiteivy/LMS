export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (
  password: string
): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateSignUpForm = (data: {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: string;
}) => {
  const errors: Record<string, string> = {};

  if (!data.email) {
    errors.email = "Email is required";
  } else if (!validateEmail(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.errors[0];
    }
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (!data.fullName.trim()) {
    errors.fullName = "Full name is required";
  }

  if (!data.role) {
    errors.role = "Please select a role";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// errorMessages
export const getAuthErrorMessage = (error: any): string => {
  if (!error) return "An unknown error occurred";

  const message =
    error?.message || error?.toString() || "An unknown error occurred";

  // Map common Supabase auth errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    "Invalid login credentials": "Invalid email or password",
    "Email not confirmed":
      "Please check your email and click the confirmation link",
    "User already registered": "An account with this email already exists",
    "Password should be at least 6 characters":
      "Password must be at least 6 characters long",
    "Unable to validate email address: invalid format":
      "Please enter a valid email address",
    "Signup requires a valid password": "Please enter a valid password",
  };

  return errorMappings[message] || message;
};
