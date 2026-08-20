/**
 * CommandInjectionProtectionService
 * 
 * Enterprise-grade Command Injection (OSi) and Background Job execution defense for MOAT Patent Intelligence Platform.
 * Enforces zero-trust execution by:
 * 1. Prohibiting raw user input in shell commands, system processes, file operations, and background jobs.
 * 2. Enforcing strict binary command allow-lists and background job identifier allow-lists.
 * 3. Prohibiting shell-based execution (e.g., shell=true, sh -c, cmd.exe) and enforcing safe child process spawn wrappers.
 * 4. Validating and resolving file operation paths against authorized base directories without traversal or null bytes.
 */

import path from "path";

export class CommandInjectionException extends Error {
  public code: string;
  public detectedTerm?: string;

  constructor(message: string, code: string = "COMMAND_INJECTION_DETECTED", detectedTerm?: string) {
    super(message);
    this.name = "CommandInjectionException";
    this.code = code;
    this.detectedTerm = detectedTerm;
  }
}

export interface SafeSpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export class CommandInjectionProtectionService {
  // Strict allow-list of authorized OS utility binaries (never allow shell interpreters like sh, bash, zsh, cmd, powershell)
  private static readonly AUTHORIZED_BINARIES = new Set([
    "pdftotext", "tesseract", "gs", "ffmpeg", "curl", "python3", "node", "zip", "unzip"
  ]);

  // Strict allow-list of authorized background job names across the MOAT platform
  private static readonly AUTHORIZED_JOBS = new Set([
    "PATENT_PDF_EXPORT", "AI_VECTOR_SYNC", "BATCH_EMAIL_DISPATCH", "TRADEMARK_OCR_PROCESS",
    "REPORT_GENERATION", "LANDSCAPE_ANALYSIS", "RENEWAL_ALERT_CRON"
  ]);

  // Dangerous command metacharacters and shell operators
  private static readonly COMMAND_META_REGEX = /[|&$;`<>\\\r\n\t(){}\[\]*?~!#\x00-\x1F\x7F]/;

  // Dangerous shell interpreters or command execution wrappers
  private static readonly DANGEROUS_SHELLS = new Set([
    "sh", "bash", "zsh", "ksh", "csh", "tcsh", "cmd", "cmd.exe", "powershell", "pwsh", "eval", "exec"
  ]);

  /**
   * 1. Validate Command Binary against Authorized Allow-List.
   * Prohibits execution of unauthorized binaries or interactive shells.
   */
  static assertAllowedCommand(command: string): string {
    if (!command || typeof command !== "string") {
      throw new CommandInjectionException("Command binary name must be a non-empty string.", "INVALID_COMMAND_TYPE");
    }

    const cleanCommand = path.basename(command.trim()).toLowerCase();

    if (this.DANGEROUS_SHELLS.has(cleanCommand)) {
      throw new CommandInjectionException(
        `Execution of shell interpreter '${cleanCommand}' is strictly prohibited. Use direct binary execution without a shell wrapper.`,
        "SHELL_EXECUTION_PROHIBITED",
        cleanCommand
      );
    }

    if (!this.AUTHORIZED_BINARIES.has(cleanCommand)) {
      throw new CommandInjectionException(
        `Command binary '${cleanCommand}' is not in the authorized system binary allow-list.`,
        "UNAUTHORIZED_COMMAND_BINARY",
        cleanCommand
      );
    }

    return cleanCommand;
  }

  /**
   * 2. Sanitize and validate individual command line arguments.
   * Strips or rejects any argument containing shell metacharacters, piping, or command substitution.
   */
  static sanitizeCommandArg(arg: any, allowPathChars = false): string {
    if (arg === null || arg === undefined) return "";
    const str = String(arg);

    // Check for command injection characters
    if (this.COMMAND_META_REGEX.test(str)) {
      throw new CommandInjectionException(
        `Command argument contains prohibited shell metacharacters or command operators: [${str}].`,
        "COMMAND_META_DETECTED",
        str
      );
    }

    if (str.startsWith("-") && str.includes("=")) {
      const [flag, val] = str.split("=", 2);
      if (this.COMMAND_META_REGEX.test(val)) {
        throw new CommandInjectionException(`Command flag value '${val}' contains dangerous metacharacters.`, "COMMAND_META_DETECTED", val);
      }
    }

    return str.trim();
  }

  /**
   * 3. Validate an array of command arguments, ensuring zero shell metacharacter injection.
   */
  static assertSafeCommandArgs(args: string[]): string[] {
    if (!Array.isArray(args)) return [];
    return args.map((arg) => this.sanitizeCommandArg(arg));
  }

  /**
   * 4. Validate File Operation Paths.
   * Resolves paths against an authorized base directory, preventing directory traversal (../../) and null byte injection (\x00).
   */
  static assertSafeFilePath(targetPath: string, allowedBaseDir: string = "/var/storage/moat"): string {
    if (!targetPath || typeof targetPath !== "string") {
      throw new CommandInjectionException("File target path must be a non-empty string.", "INVALID_FILE_PATH");
    }

    if (targetPath.includes("\x00")) {
      throw new CommandInjectionException("File path contains null byte injection sequence.", "NULL_BYTE_DETECTED", targetPath);
    }

    // Resolve absolute paths
    const resolvedPath = path.resolve(allowedBaseDir, targetPath);
    const resolvedBase = path.resolve(allowedBaseDir);

    // Ensure resolved path starts with the authorized base directory
    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
      throw new CommandInjectionException(
        `File path traversal detected! Attempted path '${targetPath}' resolves outside authorized directory '${allowedBaseDir}'.`,
        "PATH_TRAVERSAL_REJECTED",
        targetPath
      );
    }

    return resolvedPath;
  }

  /**
   * 5. Validate Background Job Dispatch parameters and job identifier against strict allow-lists.
   */
  static assertSafeBackgroundJob(jobName: string, payload: Record<string, any> = {}): { jobName: string; cleanPayload: Record<string, any> } {
    if (!jobName || typeof jobName !== "string" || !this.AUTHORIZED_JOBS.has(jobName.trim().toUpperCase())) {
      throw new CommandInjectionException(
        `Background job '${jobName}' is not authorized in the platform job allow-list.`,
        "UNAUTHORIZED_BACKGROUND_JOB",
        jobName
      );
    }

    // Inspect payload values to ensure no shell commands or command injection strings are queued
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (typeof val === "string") {
        if (this.COMMAND_META_REGEX.test(val) || /\b(?:rm\s+-rf|cat\s+\/|exec\b|eval\b|sh\s+-c)\b/i.test(val)) {
          throw new CommandInjectionException(
            `Background job payload attribute '${key}' contains dangerous command execution patterns. Job rejected.`,
            "JOB_PAYLOAD_INJECTION_DETECTED",
            val
          );
        }
        cleanPayload[key] = val.trim();
      } else {
        cleanPayload[key] = val;
      }
    }

    return { jobName: jobName.trim().toUpperCase(), cleanPayload };
  }

  /**
   * 6. Safe Execution Configuration Generator.
   * Generates validated parameters for child_process.spawn or child_process.execFile, ensuring shell=false.
   */
  static generateSafeExecutionConfig(command: string, args: string[] = [], options: SafeSpawnOptions = {}) {
    const validBinary = this.assertAllowedCommand(command);
    const validArgs = this.assertSafeCommandArgs(args);

    if (options.cwd) {
      this.assertSafeFilePath(options.cwd, options.cwd);
    }

    return {
      command: validBinary,
      args: validArgs,
      spawnOptions: {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...(options.env || {}) },
        shell: false, // CRITICAL: strictly prohibit shell evaluation!
        timeout: options.timeoutMs || 30000,
      },
    };
  }
}
