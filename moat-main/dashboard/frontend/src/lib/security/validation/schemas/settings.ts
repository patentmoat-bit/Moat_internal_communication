import { z } from "zod";
import { emailSchema, safeStringSchema } from "./common";

// 8. Document Upload Schema (for metadata validation accompanying multipart uploads)
export const DocumentUploadSchema = z.object({
  documentTitle: safeStringSchema(2, 200),
  documentType: z.enum(["Patent_Filing", "Prior_Art", "Legal_Brief", "AI_Report", "General"]),
  associatedPatentId: z.string().max(128).optional().nullable(),
  classification: z.enum(["Public", "Confidential", "Top_Secret", "Executive_Only"]).default("Confidential"),
  tags: z.array(z.string().max(30)).max(15).optional().default([]),
});

// 11. Notification Rule Schema
export const NotificationRuleSchema = z.object({
  ruleName: safeStringSchema(2, 100),
  eventType: z.enum([
    "NEW_PATENT_MATCH",
    "STATUS_CHANGE",
    "COMPETITOR_FILING",
    "CEO_REVIEW_REQUIRED",
    "SECURITY_ALERT",
    "SYSTEM_ERROR",
  ]),
  recipientRoles: z.array(z.enum(["ceo", "analyst", "admin", "design"])).min(1, "At least one recipient role must be selected."),
  emailNotify: z.boolean().default(true),
  inAppNotify: z.boolean().default(true),
  thresholdScore: z.coerce.number().int().min(0).max(100).optional().default(75),
});

// 12. Email Configuration Schema
export const EmailConfigSchema = z.object({
  smtpHost: z.string().trim().min(3, "SMTP Host is required.").max(255),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().max(128).optional().nullable(),
  smtpPassword: z.string().max(256).optional().nullable(),
  senderEmail: emailSchema,
  senderName: safeStringSchema(2, 100).default("MOAT Patent Intelligence"),
  enableSsl: z.boolean().default(true),
  testEmailRecipient: emailSchema.optional(),
});

// 14. Admin Settings Schema
export const AdminSettingsSchema = z.object({
  requireMfaForAdmins: z.boolean().default(true),
  requireMfaForAnalyst: z.boolean().default(false),
  sessionTimeoutMinutes: z.coerce.number().int().min(5).max(1440).default(60),
  maxLoginAttempts: z.coerce.number().int().min(3).max(20).default(5),
  lockoutDurationMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  ipWhitelist: z.array(z.string().max(45)).max(100).optional().default([]),
  aiSearchConfidenceThreshold: z.coerce.number().int().min(50).max(99).default(80),
  enableDetailedAuditLogging: z.boolean().default(true),
  zeroDisclosureErrors: z.boolean().default(true),
});
