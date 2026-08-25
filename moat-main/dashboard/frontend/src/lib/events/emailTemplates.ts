// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Email Templates
// Per-event email templates with contextual messaging.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get event-specific email heading and body text.
 */
export function getEventEmailContent(
  eventType: string,
  metadata: Record<string, any>,
  resourceType: string = "invention",
  projectTitle: string = "Unnamed Project"
): { heading: string; body: string } {
  const feedback = metadata?.feedback || metadata?.reason || "";

  let pType = "Patent";
  if (resourceType === "trademark") pType = "Trademark";
  if (resourceType === "copyright") pType = "Copyright";
  
  const lowerPType = pType.toLowerCase();

  const templates: Record<string, { heading: string; body: string }> = {
    PROJECT_CREATED: {
      heading: `New ${pType} Project Assigned`,
      body: `A new ${lowerPType} project "${projectTitle}" has been created and assigned to you.\n\nPlease review the project details and begin your initial assessment. You can access the project directly from your dashboard.`,
    },
    PROJECT_ASSIGNED: {
      heading: `${pType} Project Assignment Notification`,
      body: `You have been assigned to the ${lowerPType} project "${projectTitle}".\n\nPlease review the project requirements and update your task status accordingly.`,
    },
    RESEARCH_STARTED: {
      heading: `${pType} Research Phase Started`,
      body: `Research has begun on the ${lowerPType} project "${projectTitle}".\n\nThe assigned team is now conducting analysis. Updates will be provided as the research progresses.`,
    },
    DOCUMENT_UPLOADED: {
      heading: `${pType} Document Uploaded`,
      body: `A new document has been uploaded for the ${lowerPType} project "${projectTitle}".\n\nPlease review the uploaded materials at your earliest convenience.`,
    },
    DESIGN_REQUESTED: {
      heading: `${pType} Design Work Required`,
      body: `Design work has been requested for the ${lowerPType} project "${projectTitle}".\n\nPlease review the design requirements and begin preparing the necessary visual materials.`,
    },
    DESIGN_STARTED: {
      heading: `${pType} Design Work In Progress`,
      body: `The design team has started working on the ${lowerPType} project "${projectTitle}".\n\nDesign assets are being prepared and will be submitted for review upon completion.`,
    },
    DESIGN_COMPLETED: {
      heading: `${pType} Design Work Completed`,
      body: `Design work has been completed for the ${lowerPType} project "${projectTitle}".\n\nAll design materials are now ready for review. Please proceed with your assessment.`,
    },
    REPORT_SUBMITTED: {
      heading: `${pType} Report Submitted for CEO Review`,
      body: `A report has been submitted for the ${lowerPType} project "${projectTitle}".\n\nThis project is now ready for executive review and approval. Please review the attached report and provide your decision.`,
    },
    CEO_APPROVED: {
      heading: `${pType} Project Approved ✓`,
      body: `Great news! The ${lowerPType} project "${projectTitle}" has been approved by the CEO.\n\nThe project will now move forward. Please coordinate with the team to prepare any remaining items.`,
    },
    CEO_REJECTED: {
      heading: `${pType} Revision Required`,
      body: `The ${lowerPType} project "${projectTitle}" requires revision based on CEO feedback.\n\n${feedback ? `Feedback: ${feedback}\n\n` : ""}Please review the feedback and make the necessary changes before resubmitting for approval.`,
    },
    REVISION_REQUIRED: {
      heading: `${pType} Revision Required`,
      body: `The ${lowerPType} project "${projectTitle}" has been sent back for revision.\n\n${feedback ? `Reason: ${feedback}\n\n` : ""}Please address the feedback and resubmit when ready.`,
    },
    REVISION_COMPLETED: {
      heading: `${pType} Revision Completed — Ready for Review`,
      body: `Revisions have been completed for the ${lowerPType} project "${projectTitle}".\n\nThe updated materials are now ready for executive review. Please review the changes at your earliest convenience.`,
    },
    FILING_STARTED: {
      heading: `${pType} Filing Started`,
      body: `The filing process has been initiated for the ${lowerPType} project "${projectTitle}".\n\nAll necessary documents are being prepared and will be submitted appropriately.`,
    },
    FILED: {
      heading: `${pType} Filed Successfully`,
      body: `The filing for the ${lowerPType} project "${projectTitle}" has been successfully completed.\n\nThe application is now under examination. You will be notified of any updates or actions required.`,
    },
    RENEWAL_REMINDER: {
      heading: `${pType} Renewal Reminder`,
      body: `This is a reminder that the renewal for the ${lowerPType} project "${projectTitle}" is approaching.\n\nPlease ensure all necessary actions are taken on time.`,
    },
    PROJECT_COMPLETED: {
      heading: `${pType} Project Completed ✓`,
      body: `The ${lowerPType} project "${projectTitle}" has been completed.\n\nAll phases of the project lifecycle have been successfully finalized. Thank you to everyone involved.`,
    },
    STATUS_UPDATED: {
      heading: `${pType} Project Status Updated`,
      body: `The status of the ${lowerPType} project "${projectTitle}" has been updated.\n\nPlease review the new workflow status.`,
    },
    FINANCE_PAYMENT_COMPLETED: {
      heading: `${pType} Payment Completed ✓`,
      body: `The payment for the ${lowerPType} project "${projectTitle}" has been completed by Finance.\n\nThe project is now fully paid and finalized from a financial perspective.`,
    },
    PROJECT_UPDATED: {
      heading: `${pType} Project Updated`,
      body: `The ${lowerPType} project "${projectTitle}" has been updated with new information.\n\nPlease review the project details.`,
    },
    DOCUMENT_SHARED_ANALYST: {
      heading: `${pType} Document Shared with Patent Analyst`,
      body: `A document related to the ${lowerPType} project "${projectTitle}" has been shared with you by the CEO.\n\nPlease review the document in your workspace.`,
    },
    DOCUMENT_SHARED_DRAFTER: {
      heading: `${pType} Document Shared with Patent Drafter`,
      body: `A document related to the ${lowerPType} project "${projectTitle}" has been shared with you by the CEO.\n\nPlease review the document in your workspace and proceed with drafting work as necessary.`,
    },
    DOCUMENT_SHARED_DESIGNER: {
      heading: `${pType} Document Shared with Design Team`,
      body: `A document related to the ${lowerPType} project "${projectTitle}" has been shared with you by the CEO.\n\nPlease review the document in your workspace and proceed with design work as necessary.`,
    },
  };

  return templates[eventType] || {
    heading: `Workflow Update: ${eventType.replace(/_/g, " ")}`,
    body: `A workflow update has occurred for "${projectTitle}". Please check your dashboard for details.`,
  };
}

/**
 * Generate the full HTML email template.
 * Professional, branded template matching MOAT's design language.
 */
export const generateEmailTemplate = (
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string,
  metadata?: Record<string, any>
) => {
  let metadataHtml = "";
  if (metadata && Object.keys(metadata).length > 0) {
    const rows = Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(
        ([key, value]) =>
          `<tr><td style="padding: 8px 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; white-space: nowrap;">${key
            .replace(/_/g, " ")
            .toUpperCase()}</td><td style="padding: 8px 12px; color: #111827; font-size: 14px;">${value}</td></tr>`
      )
      .join("");

    metadataHtml = `
      <table style="width: 100%; background-color: #f9fafb; border-radius: 8px; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e5e7eb;">
        ${rows}
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 32px 30px; text-align: center; }
        .logo { font-size: 28px; font-weight: 900; color: #ffffff; margin: 0; letter-spacing: -0.025em; }
        .logo span { color: #c9a84c; }
        .badge { display: inline-block; background-color: #c9a84c; color: #111827; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px; margin-top: 12px; }
        .content { padding: 40px 30px; }
        .title { font-size: 22px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 8px; line-height: 1.3; }
        .divider { height: 3px; width: 40px; background-color: #c9a84c; border: none; margin: 0 0 20px 0; border-radius: 2px; }
        .message { font-size: 15px; line-height: 1.7; color: #4b5563; margin: 0 0 24px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #c9a84c 0%, #b8921e 100%); color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(201, 168, 76, 0.3); }
        .footer { background-color: #f9fafb; padding: 24px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        .footer a { color: #c9a84c; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">MOAT <span>Platform</span></h1>
          <div class="badge">Patent Intelligence</div>
        </div>
        <div class="content">
          <h2 class="title">${title}</h2>
          <hr class="divider" />
          <div class="message">${message.replace(/\n/g, "<br/>")}</div>
          ${metadataHtml}
          ${
            actionUrl && actionText
              ? `<div style="text-align: center; margin-top: 32px;"><a href="${actionUrl}" class="button">${actionText}</a></div>`
              : ""
          }
        </div>
        <div class="footer">
          <p>This is an automated notification from the MOAT Patent Intelligence Platform.</p>
          <p>&copy; ${new Date().getFullYear()} <a href="#">MOAT</a>. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
