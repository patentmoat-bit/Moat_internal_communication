import { NextRequest, NextResponse } from "next/server";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, tenantId, clientId, clientSecret, fromEmail, toEmails, ccEmails } = body;

    // Support both legacy single toEmail and new toEmails array
    const toList: string[] = Array.isArray(toEmails) ? toEmails : (body.toEmail ? [body.toEmail] : []);
    const ccList: string[] = Array.isArray(ccEmails) ? ccEmails : [];

    if (!provider || !fromEmail) {
      return NextResponse.json({ error: "Missing essential provider or fromEmail details." }, { status: 400 });
    }

    if (toList.length === 0) {
      return NextResponse.json({ error: "Please provide at least one TO recipient email address." }, { status: 400 });
    }

    if (provider.includes("Google Workspace") || provider.includes("AWS SES")) {
      return NextResponse.json({ error: `${provider} integration is not yet implemented. Please use Microsoft Graph.` }, { status: 501 });
    }

    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Tenant ID, Client ID, and Client Secret are required for Microsoft Graph." }, { status: 400 });
    }

    // 1. Fetch OAuth Token from Microsoft Entra ID (Azure AD)
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString()
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json({ 
        error: `Authentication failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}` 
      }, { status: 401 });
    }

    const accessToken = tokenData.access_token;

    // 2. Build recipients for TO and CC
    const toRecipients = toList.map((email: string) => ({
      emailAddress: { address: email }
    }));

    const ccRecipients = ccList.map((email: string) => ({
      emailAddress: { address: email }
    }));

    // 3. Dispatch Email via Microsoft Graph API
    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromEmail)}/sendMail`;
    
    const emailPayload: any = {
      message: {
        subject: "Test Email from MOAT Patent Intelligence Platform",
        body: {
          contentType: "HTML",
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #c9a84c;">MOAT Platform Test</h2>
              <p>Hello,</p>
              <p>Your Microsoft Graph API email integration was successfully configured!</p>
              <p>This is a test email sent securely via OAuth2 from your dashboard.</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 12px; color: #6b7280;">Sent securely by MOAT Platform.</p>
            </div>
          `
        },
        toRecipients
      },
      saveToSentItems: "true"
    };

    // Only add ccRecipients if there are any
    if (ccRecipients.length > 0) {
      emailPayload.message.ccRecipients = ccRecipients;
    }

    const mailResponse = await fetch(sendMailUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });

    if (!mailResponse.ok) {
      const mailError = await mailResponse.json();
      const errorMessage = mailError.error?.message || "Unknown error occurred while sending email.";
      return NextResponse.json({ 
        error: `Graph API Error: ${errorMessage} (Make sure your Azure app has 'Mail.Send' Application permission)` 
      }, { status: mailResponse.status });
    }

    // Build a descriptive success message
    const toDesc = `TO: ${toList.join(", ")}`;
    const ccDesc = ccList.length > 0 ? ` | CC: ${ccList.join(", ")}` : "";

    return NextResponse.json({ 
      success: true, 
      message: `Test email successfully dispatched via ${provider}. ${toDesc}${ccDesc}`
    });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

