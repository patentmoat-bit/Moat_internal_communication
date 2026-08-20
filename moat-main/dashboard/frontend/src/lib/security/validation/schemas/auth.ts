import { z } from "zod";
import { emailSchema, passwordSchema, safeStringSchema } from "./common";

// 1. Login Schema
export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(128, "Password exceeds maximum length."),
  rememberMe: z.boolean().optional().default(false),
  captchaToken: z.string().max(2048).optional(),
});

// 2. Registration Schema
export const RegistrationSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Password confirmation is required."),
    fullName: safeStringSchema(2, 100),
    companyName: safeStringSchema(2, 120).optional(),
    role: z.enum(["analyst", "viewer", "admin", "design"]).optional().default("analyst"),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms of service." }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// 3a. Forgot Password Request Schema
export const ForgotPasswordSchema = z.object({
  email: emailSchema,
  captchaToken: z.string().max(2048).optional(),
});

// 3b. Reset Password Completion Schema
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(10, "Invalid reset token format.").max(512, "Token is too long."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Password confirmation is required."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"],
  });

// 4. MFA Verification Schema
export const MfaVerifySchema = z.object({
  email: emailSchema.optional(),
  userId: z.string().max(128).optional(),
  code: z
    .string()
    .trim()
    .length(6, "MFA code must be exactly 6 digits.")
    .regex(/^\d{6}$/, "MFA code must contain only numerical digits."),
  trustDevice: z.boolean().optional().default(false),
});
