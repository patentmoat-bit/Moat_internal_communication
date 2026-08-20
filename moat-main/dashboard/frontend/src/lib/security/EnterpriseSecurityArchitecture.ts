/**
 * EnterpriseSecurityArchitecture (Phase 12)
 * 
 * Centralized facade unifying all 9 modular security components of the MOAT Patent Intelligence Platform.
 * All APIs, controllers, and backend workflows MUST import from this shared boundary to ensure
 * zero-trust validation, strict sanitization, immutable audit logging, and zero information disclosure.
 */

// 1. Validation Middleware
export { GlobalValidationMiddleware, GlobalValidationMiddleware as ValidationMiddleware } from "./validation/GlobalValidationMiddleware";

// 2. Schema Validation Service
export { SchemaValidationService, SchemaValidationException } from "./validation/SchemaValidationService";

// 3. Input Sanitization Service
export { InputSanitizationService } from "./validation/InputSanitizationService";

// 4. Output Encoding Service
export { OutputEncodingService } from "./validation/OutputEncodingService";

// 5. Request Size Validator
export { RequestSizeValidationService, RequestSizeValidationService as RequestSizeValidator, RequestSizeException } from "./validation/RequestSizeValidationService";

// 6. Allow-list Validator
export { AllowListValidationService, AllowListValidationService as AllowListValidator, AllowListException } from "./validation/AllowListValidationService";

// 7. Security Logger
export { SecurityLoggingService, SecurityLoggingService as SecurityLogger } from "./SecurityLoggingService";
export type { ServerSideErrorLog, ValidationFailureLog } from "./SecurityLoggingService";

// 8. Repository Layer
export { RepositoryLayer, RepositoryException } from "../repository/RepositoryLayer";
export type { RepositoryExecutionResult } from "../repository/RepositoryLayer";

// 9. Error Response Builder
export { ErrorResponseBuilder } from "../errors/ErrorResponseBuilder";
export type { StandardSuccessResponse, StandardErrorResponse } from "../errors/ErrorResponseBuilder";

// Additional specialized security engines
export { InjectionProtectionService } from "./validation/InjectionProtectionService";
export { SqlInjectionProtectionService, SqlInjectionException } from "./validation/SqlInjectionProtectionService";
export { CommandInjectionProtectionService, CommandInjectionException } from "./validation/CommandInjectionProtectionService";
export { HeaderInjectionProtectionService, HeaderInjectionException } from "./validation/HeaderInjectionProtectionService";
export { AuditLogService } from "./auditLogService";
export type { SecurityEventType, SecurityLogPayload, ImmutableAuditLogRecord } from "./auditLogService";
