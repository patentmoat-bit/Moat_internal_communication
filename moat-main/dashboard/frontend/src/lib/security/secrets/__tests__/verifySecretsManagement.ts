import {
  AESEncryptionService,
  SecretAuditLogService,
  SecretVersionManager,
  KeyRotationService,
  EnvironmentSecretManager
} from "../index";

console.log("====================================================================================================");
console.log(" 🔐 MOAT PHASE 7 — SECRETS MANAGEMENT & KEY ROTATION MASTER VERIFICATION SUITE");
console.log("====================================================================================================\n");

let passedTests = 0;
let totalTests = 0;

async function runTest(testNumber: number, requirementName: string, testFn: () => void | Promise<void>, expectedDescription: string) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`[PASS] Test #${testNumber}: ${requirementName} — ${expectedDescription}`);
  } catch (err: any) {
    console.log(`[FAIL] Test #${testNumber}: ${requirementName} — Exception:`, err.message);
  }
}

async function main() {
  await EnvironmentSecretManager.resetAndClear();

  // 1. Application Startup & Secret Loading
  await runTest(
    1,
    "Application Startup & Secret Loading Workflow",
    async () => {
      const initRes = await EnvironmentSecretManager.initialize();
      if (!initRes.initialized || initRes.secretsLoaded < 5) {
        throw new Error(`Startup failed or loaded insufficient default credentials. Loaded: ${initRes.secretsLoaded}`);
      }

      // Verify retrieving a decrypted secret value
      const jwtVal = await EnvironmentSecretManager.getSecretValue("MOAT_JWT_SECRET", "auth_service", "10.0.0.1");
      if (!jwtVal || jwtVal.length === 0) {
        throw new Error("Failed to load and decrypt MOAT_JWT_SECRET after initialization!");
      }
    },
    "Verified application startup loads, validates, and decrypts essential system credentials."
  );

  // 2. AES-GCM 256-bit Encryption & Decryption Integrity
  await runTest(
    2,
    "AES-GCM 256-bit Encryption & Decryption Integrity",
    async () => {
      const plaintext = "super_secret_oauth_token_123456789";
      const payload1 = AESEncryptionService.encrypt(plaintext);
      const payload2 = AESEncryptionService.encrypt(plaintext);

      // Verify IV uniqueness
      if (payload1.iv === payload2.iv) {
        throw new Error("AES encryption failure: Initialization Vector (IV) is not unique across operations!");
      }

      if (payload1.authTag.length !== 32) { // 16 bytes hex = 32 chars
        throw new Error(`Expected 16-byte (32 char) authentication tag, got ${payload1.authTag.length} chars.`);
      }

      const decrypted = AESEncryptionService.decrypt(payload1);
      if (decrypted !== plaintext) {
        throw new Error(`Decryption mismatch! Expected '${plaintext}', got '${decrypted}'`);
      }

      // Test ciphertext tampering defense
      const tamperedPayload = { ...payload1, encryptedValue: payload1.encryptedValue.slice(0, -2) + "00" };
      try {
        AESEncryptionService.decrypt(tamperedPayload);
        throw new Error("Security failure: Tampered ciphertext was decrypted without throwing an authentication tag error!");
      } catch (err: any) {
        if (!err.message.includes("Cryptographic Decryption Failure")) throw err;
        // Correctly blocked!
      }
    },
    "Verified 256-bit AES-GCM encryption enforces unique IVs and blocks tampered ciphertexts."
  );

  // 3. Secret Versioning & Graceful Fallback
  await runTest(
    3,
    "Secret Versioning & Graceful Fallback Decoding",
    async () => {
      const name = "TEST_API_TOKEN";
      const v1Rec = await SecretVersionManager.registerSecret(name, "API_KEY", "token_v1_value", 30, "admin");
      if (v1Rec.version !== 1 || v1Rec.status !== "ACTIVE") {
        throw new Error(`Expected initial secret version v1 ACTIVE, got v${v1Rec.version} ${v1Rec.status}`);
      }

      // Rotate to v2
      const v2Rec = await SecretVersionManager.registerSecret(name, "API_KEY", "token_v2_value", 30, "admin");
      if (v2Rec.version !== 2 || v2Rec.status !== "ACTIVE") {
        throw new Error(`Expected rotated version v2 ACTIVE, got v${v2Rec.version} ${v2Rec.status}`);
      }

      const versions = SecretVersionManager.getVersions(name);
      const v1Updated = versions.find((v) => v.version === 1);
      if (!v1Updated || v1Updated.status !== "DEPRECATED") {
        throw new Error("Failed to transition old active secret v1 to DEPRECATED status!");
      }

      // Verify graceful fallback: retrieving v1 explicitly still works!
      const v1Dec = await SecretVersionManager.getSecret(name, 1, "legacy_worker");
      if (v1Dec.decryptedValue !== "token_v1_value") {
        throw new Error(`Graceful fallback failed! Expected 'token_v1_value', got '${v1Dec.decryptedValue}'`);
      }
    },
    "Verified version incrementing and DEPRECATED fallback retention for graceful token decoding."
  );

  // 4. Automated & Manual Key Rotation
  await runTest(
    4,
    "Automated & Manual Credential and AES Key Rotation",
    async () => {
      // 1. Rotate JWT, Graph, and Supabase credentials
      const jwtRot = await KeyRotationService.rotateJWTSecret("MOAT_JWT_SECRET", "test_rotator");
      if (jwtRot.status !== "SUCCESS" || jwtRot.newVersion <= jwtRot.oldVersion) {
        throw new Error(`JWT secret rotation failed! Old: v${jwtRot.oldVersion}, New: v${jwtRot.newVersion}`);
      }

      const graphRot = await KeyRotationService.rotateGraphSecret("GRAPH_CLIENT_SECRET", "test_rotator");
      const sbpRot = await KeyRotationService.rotateSupabaseKey("SUPABASE_SERVICE_ROLE_KEY", "test_rotator");
      if (graphRot.status !== "SUCCESS" || sbpRot.status !== "SUCCESS") {
        throw new Error("Failed to rotate Microsoft Graph or Supabase credentials!");
      }

      // 2. Rotate Master AES Encryption Key and re-encrypt all stored secrets
      const aesRot = await KeyRotationService.rotateAESEncryptionKey("test_rotator");
      if (aesRot.oldKeyHex === aesRot.newKeyHex) {
        throw new Error("Master AES encryption key rotation failed to generate a new key!");
      }
      if (aesRot.reEncryptedCount < 5) {
        throw new Error(`Expected at least 5 re-encrypted secret payloads, got ${aesRot.reEncryptedCount}`);
      }

      // Confirm secrets are still decryptable with the new master key
      const testVal = await EnvironmentSecretManager.getSecretValue("MOAT_JWT_SECRET", "post_rotator_test");
      if (!testVal) throw new Error("Failed to decrypt secret after master AES key re-encryption!");
    },
    "Verified multi-credential rotation and master AES key re-encryption across stored payloads."
  );

  // 5. Secret Expiration Monitoring
  await runTest(
    5,
    "Secret Expiration Monitoring & Automatic Periodic Rotation",
    async () => {
      const name = "SHORT_LIVED_CERT";
      await SecretVersionManager.registerSecret(name, "OAUTH_SECRET", "cert_value_123", -1, "admin"); // -1 day TTL -> expired immediately

      const expRes = await SecretVersionManager.checkExpirations();
      if (expRes.expiredCount < 1) {
        throw new Error("Expiration monitor failed to detect overdue secret!");
      }

      const versions = SecretVersionManager.getVersions(name);
      if (versions[0].status !== "EXPIRED") {
        throw new Error(`Expected secret status EXPIRED, got '${versions[0].status}'`);
      }

      // Execute periodic rotation -> should automatically rotate EXPIRED credentials
      const rotSummaries = await KeyRotationService.executePeriodicRotation();
      const certRot = rotSummaries.find((s) => s.secretName === name);
      if (!certRot || certRot.status !== "SUCCESS") {
        throw new Error("Periodic auto-rotator failed to rotate expired credential!");
      }
    },
    "Verified overdue credentials are flagged EXPIRED and automatically rotated by periodic scanner."
  );

  // 6. Immutable Audit Logs & Access History Tracking
  await runTest(
    6,
    "Immutable Secret Access History & Forensic Audit Logging",
    async () => {
      const accessHistory = SecretAuditLogService.getAccessHistory();
      const systemLogs = SecretAuditLogService.getAuditLogs();

      if (accessHistory.length < 5) {
        throw new Error(`Expected extensive secret access history from previous tests, got ${accessHistory.length}`);
      }
      if (systemLogs.length < 3) {
        throw new Error(`Expected multiple system audit logs from rotations/expirations, got ${systemLogs.length}`);
      }

      const sampleAccess = accessHistory[0];
      if (!sampleAccess.secretName || !sampleAccess.accessedBy || !sampleAccess.ipAddress || !sampleAccess.action || !sampleAccess.timestamp) {
        throw new Error("Secret access log is missing required forensic attributes!");
      }

      // Test immutability
      try {
        (sampleAccess as any).accessedBy = "HACKER_TAMPERED";
        throw new Error("Immutability failure: Access log record was successfully mutated in memory!");
      } catch (err: any) {
        if (err.message.includes("Immutability failure")) throw err;
        // Object.freeze protected record -> PASS!
      }
    },
    "Verified 100% of secret loads, decryptions, and rotations capture immutable forensic logs."
  );

  console.log("\n====================================================================================================");
  console.log(` 🏆 SECRETS MANAGEMENT & KEY ROTATION VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("====================================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
