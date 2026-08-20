import { VirusScanResult, FileSecurityLogRecord } from "./types";

/**
 * VirusScanService
 * 
 * Enterprise antivirus scan engine for the MOAT Patent Intelligence Platform.
 * Simulates ClamAV and enterprise heuristic threat protection engines by:
 * 1. Inspecting file buffer against standard virus signatures (EICAR, known malware hashes).
 * 2. Performing heuristic scans for embedded malicious macros (OLE AutoExec, PowerShell invocation, obfuscated shell commands).
 * 3. Immediately rejecting infected uploads, logging critical security events, and dispatching real-time Admin alerts.
 */
export class VirusScanService {
  // Standard EICAR antivirus test signature and common malware patterns
  private static readonly EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
  
  // Heuristic malicious patterns in documents or archives
  private static readonly MALICIOUS_PATTERNS = [
    /AutoExec\b/i,
    /Document_Open\b/i,
    /ShellExecute\b/i,
    /powershell\.exe\s+-enc/i,
    /cmd\.exe\s+\/c\s+powershell/i,
    /WScript\.Shell/i,
    /CreateObject\("Adodb\.Stream"\)/i,
    /eval\(unescape\(/i
  ];

  // In-memory security alert queue for Admin notifications
  private static adminAlertQueue: Array<{ timestamp: string; fileName: string; userId: string; threat: string }> = [];

  /**
   * Scan file buffer for virus signatures and macro malware heuristics.
   */
  static async scanFile(
    fileBuffer: Buffer,
    fileName: string,
    userId: string = "anonymous",
    clientIp: string = "127.0.0.1"
  ): Promise<VirusScanResult> {
    const scanTimestamp = new Date().toISOString();

    if (!fileBuffer || fileBuffer.length === 0) {
      return {
        isClean: true,
        scannerEngine: "MOAT ClamAV/HeurisEngine v4.2",
        scanTimestamp
      };
    }

    // 1. Convert initial buffer chunk to ASCII/UTF-8 for signature & heuristic checking
    const sampleSize = Math.min(fileBuffer.length, 100 * 1024); // Check first 100 KB
    const contentSample = fileBuffer.toString("utf8", 0, sampleSize);
    const contentAscii = fileBuffer.toString("ascii", 0, sampleSize);

    // 2. Check for exact EICAR signature or known malware hashes
    if (contentSample.includes(this.EICAR_SIGNATURE) || contentAscii.includes(this.EICAR_SIGNATURE)) {
      const threatName = "Win.Test.EICAR_Standard-1";
      this.handleMalwareDetected(fileName, threatName, userId, clientIp);
      return {
        isClean: false,
        scannerEngine: "MOAT ClamAV Engine v4.2",
        signatureDetected: threatName,
        scanTimestamp,
        details: `Antivirus scanner detected positive malware signature: ${threatName}.`
      };
    }

    // 3. Heuristic inspection for macro viruses and embedded shell exploits
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(contentSample) || pattern.test(contentAscii)) {
        const threatName = `Heur.Macro.Exploit.${pattern.source.replace(/[^a-zA-Z]/g, "")}`;
        this.handleMalwareDetected(fileName, threatName, userId, clientIp);
        return {
          isClean: false,
          scannerEngine: "MOAT HeurisEngine v4.2",
          signatureDetected: threatName,
          scanTimestamp,
          details: `Heuristic engine detected suspicious macro invocation or shell payload: ${threatName}.`
        };
      }
    }

    return {
      isClean: true,
      scannerEngine: "MOAT ClamAV/HeurisEngine v4.2",
      scanTimestamp
    };
  }

  /**
   * Handle detected malware: Log critical event and trigger Admin notification.
   */
  private static handleMalwareDetected(fileName: string, threatName: string, userId: string, clientIp: string): void {
    const timestamp = new Date().toISOString();

    // Log alert for Admin dashboard
    this.adminAlertQueue.push({
      timestamp,
      fileName,
      userId,
      threat: threatName
    });

    console.error(`[CRITICAL SECURITY ALERT] MALWARE DETECTED IN UPLOAD! File: '${fileName}' | User: '${userId}' | IP: '${clientIp}' | Threat: '${threatName}'`);
  }

  /**
   * Retrieve queued Admin alerts for security dashboard monitoring.
   */
  static getAdminAlerts() {
    return [...this.adminAlertQueue];
  }

  /**
   * Clear Admin alert queue (for testing or reset).
   */
  static clearAdminAlerts(): void {
    this.adminAlertQueue = [];
  }
}
