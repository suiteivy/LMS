import { z } from "zod";

// Login form inputs schema
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  role: z.enum(["Admin", "Teacher", "Student"], {
    message: "Please select a role",
  }),
});

export type LoginFormInputs = z.infer<typeof loginSchema>;


//  sign-up form inputs schema
export const signUpSchema = z
  .object({
    name: z.string().min(1, "Full Name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], 
  })

export type SignUpFormInputs = z.infer<typeof signUpSchema>;
