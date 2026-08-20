import { OutputEncodingService } from "../OutputEncodingService";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE OUTPUT ENCODING & XSS PROTECTION — VERIFICATION RUNNER");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(testName: string, testFn: () => void, expectedDescription: string) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`[PASS] Req #${totalTests}: ${testName} — ${expectedDescription}`);
  } catch (err: any) {
    console.log(`[FAIL] Req #${totalTests}: ${testName} — Exception:`, err.message);
  }
}

// 1. HTML Text Encoding
runTest(
  "1. Plain Text HTML Encoding (Reflected & Stored XSS Defense)",
  () => {
    const raw = `<script>alert('XSS & Cookie="stolen"')</script>`;
    const encoded = OutputEncodingService.encodeHtml(raw);

    if (encoded.includes("<") || encoded.includes(">") || encoded.includes('"') || encoded.includes("'")) {
      throw new Error(`Unescaped characters found in HTML encoded output: ${encoded}`);
    }
    if (encoded !== "&lt;script&gt;alert(&#x27;XSS &amp; Cookie&#x3D;&quot;stolen&quot;&#x27;)&lt;&#x2F;script&gt;") {
      throw new Error(`Unexpected encoding mismatch: ${encoded}`);
    }
  },
  "Converted all dangerous HTML metacharacters (<, >, &, \", ', /, =) into secure HTML entities."
);

// 2. HTML Attribute Encoding
runTest(
  "2. HTML Attribute Context Encoding",
  () => {
    const attrVal = `javascript:alert(1); "onmouseover='hack()'`;
    const encoded = OutputEncodingService.encodeAttribute(attrVal);

    if (encoded.includes("(") || encoded.includes(")") || encoded.includes('"') || encoded.includes("'")) {
      throw new Error(`Unescaped characters found in attribute encoded output: ${encoded}`);
    }
    if (!encoded.includes("&#x3B;") || !encoded.includes("&#x22;")) {
      throw new Error(`Hex encoding missing in attribute output: ${encoded}`);
    }
  },
  "Hex-encoded all non-alphanumeric ASCII characters (&#xHH;) for secure insertion inside attribute quotes."
);

// 3. JSON Response Encoding
runTest(
  "3. Safe JSON Response Encoding (DOM XSS & Script Boundary Defense)",
  () => {
    const payload = {
      title: "Patent <script>alert(1)</script>",
      note: "Line 1\u2028Line 2\u2029 -- end <!-- comment -->",
    };
    const jsonStr = OutputEncodingService.encodeJson(payload);

    if (jsonStr.includes("<script>") || jsonStr.includes("</script>") || jsonStr.includes("<!--") || jsonStr.includes("--")) {
      throw new Error(`Dangerous script boundaries leaked into JSON: ${jsonStr}`);
    }
    if (!jsonStr.includes("\\u003cscript\\u003e") || !jsonStr.includes("\\u2028")) {
      throw new Error(`Expected Unicode escapes missing in JSON: ${jsonStr}`);
    }
  },
  "Escaped script boundaries (<script>, </script>, <!--), hyphens (--), and line separators (\u2028, \u2029) in JSON payloads."
);

// 4. Rich Text Sanitization
runTest(
  "4. Rich Text Sanitization & Allow-List Formatting",
  () => {
    const dirtyRich = `<p><b>Patent Overview</b></p><script>alert('hack')</script><a href="javascript:alert(1)" onerror="steal()">Click</a><custom>tag</custom>`;
    const cleanRich = OutputEncodingService.encodeRichText(dirtyRich);

    if (cleanRich.includes("<script>") || cleanRich.includes("alert('hack')") || cleanRich.includes("onerror=") || cleanRich.includes("javascript:")) {
      throw new Error(`XSS vectors survived rich text sanitization: ${cleanRich}`);
    }
    if (!cleanRich.includes("<p><b>Patent Overview</b></p>") || !cleanRich.includes('<a href="#">Click</a>')) {
      throw new Error(`Authorized formatting tags or sanitized links malformed: ${cleanRich}`);
    }
    if (!cleanRich.includes("&lt;custom&gt;tag&lt;&#x2F;custom&gt;")) {
      throw new Error(`Unlisted tag was not HTML encoded: ${cleanRich}`);
    }
  },
  "Preserved allow-listed rich text formatting tags while eliminating scripts, event handlers, and javascript: URLs."
);

// 5. Recursive API Response Payload Encoding
runTest(
  "5. Recursive API Response Payload Encoding",
  () => {
    const apiResponse = {
      status: "success",
      count: 2,
      patents: [
        { id: "US-101", title: "Engine <v2>", summary: "<p><b>Summary</b><script>alert(1)</script></p>" },
        { id: "US-102", title: '"Quote" & Test', summary: "Plain summary <script>" },
      ],
    };

    const encodedRes = OutputEncodingService.encodeResponsePayload(apiResponse, new Set(["summary"]));

    if (encodedRes.patents[0].title !== "Engine &lt;v2&gt;" || encodedRes.patents[1].title !== "&quot;Quote&quot; &amp; Test") {
      throw new Error(`Plain text fields not properly HTML encoded: ${JSON.stringify(encodedRes)}`);
    }
    if (encodedRes.patents[0].summary.includes("<script>") || !encodedRes.patents[0].summary.includes("<p><b>Summary</b></p>")) {
      throw new Error(`Rich text summary not properly sanitized: ${encodedRes.patents[0].summary}`);
    }
  },
  "Recursively traversed API response objects, encoding standard strings while applying rich text sanitization to designated fields."
);

console.log("\n================================================================================");
console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
console.log("================================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
