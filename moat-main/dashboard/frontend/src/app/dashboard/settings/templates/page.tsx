"use client";

import { useState } from "react";
import { 
  Code2, Eye, Send, AlertTriangle, UserPlus, KeyRound, Laptop, ShieldAlert,
  Users, UserMinus, UserCheck, Shield, ChevronDown, ChevronRight, FileText,
  Upload, CheckCircle, Activity, FileSearch, Scale, Presentation, MessageSquare,
  FileBarChart, BarChart3, Database, FileOutput, ArrowRight, Plus, Copy, Power, HelpCircle, ToggleLeft, ToggleRight
} from "lucide-react";
import { cn } from "@/lib/utils";

type CategoryName = "User Management" | "Patent Workflow" | "Tracker Module" | "Upload Center" | "Feedback Module" | "Report Automation";

interface EmailTemplate {
  id: string;
  category: CategoryName;
  name: string;
  subject: string;
  icon: any;
  html: string;
  status?: "active" | "disabled";
}

const basicWrapper = (content: string) => `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #131309; padding: 24px; text-align: center; border-bottom: 2px solid #c9a84c;">
    <h1 style="color: #c9a84c; margin: 0; font-size: 24px;">MOAT</h1>
  </div>
  <div style="padding: 32px; background-color: #ffffff; color: #1f2937;">
    ${content}
  </div>
  <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
    &copy; {{current_year}} MOAT Patent Intelligence Platform.<br>All rights reserved.
  </div>
</div>`;

const templates: EmailTemplate[] = [
  // ==============================
  // USER MANAGEMENT
  // ==============================
  {
    id: "um-new", category: "User Management", name: "New User Account Created", subject: "Welcome to MOAT Patent Intelligence", icon: UserPlus,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">Welcome aboard, {{user_name}}!</h2>
      <p>Your enterprise account for the MOAT Platform has been provisioned.</p>
      <p><strong>Assigned Role:</strong> {{role_name}}</p>
      <p>Please log in using your temporary credentials and update your password immediately.</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="{{login_url}}" style="background-color: #c9a84c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Workspace</a>
      </div>
    `)
  },
  {
    id: "um-reset", category: "User Management", name: "Password Reset", subject: "Reset your MOAT Password", icon: KeyRound,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to choose a new password.</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="{{reset_url}}" style="background-color: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">If you didn't request this, please ignore this email or contact support.</p>
    `)
  },
  {
    id: "um-role", category: "User Management", name: "Role Assigned/Updated", subject: "Your Role has been Updated", icon: Shield,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">Role Modification</h2>
      <p>Your access permissions on the MOAT platform have been modified by an administrator.</p>
      <p><strong>New Role:</strong> {{new_role}}</p>
      <p>This may unlock new modules or restrict access to certain features. Changes are effective immediately.</p>
    `)
  },
  {
    id: "um-fail", category: "User Management", name: "Failed Login Attempts", subject: "Security Alert: Multiple Failed Logins", icon: ShieldAlert,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #ef4444;">Security Alert</h2>
      <p>We detected multiple failed login attempts on your account.</p>
      <ul style="background-color: #fef2f2; padding: 16px 32px; border-radius: 8px; color: #991b1b; border: 1px solid #fecaca;">
        <li><strong>Time:</strong> {{timestamp}}</li>
        <li><strong>IP Address:</strong> {{ip_address}}</li>
        <li><strong>Attempts:</strong> {{attempt_count}}</li>
      </ul>
      <p>If this wasn't you, your account may be under attack. We recommend resetting your password.</p>
    `)
  },

  // ==============================
  // PATENT WORKFLOW
  // ==============================
  {
    id: "pw-proj", category: "Patent Workflow", name: "Project Created", subject: "New Patent Project: {{project_name}}", icon: Presentation,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">New Project Initiated</h2>
      <p>A new patent project has been created and assigned to your team.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; font-weight: bold; width: 40%;">Project Name</td>
          <td style="padding: 12px 0;">{{project_name}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; font-weight: bold;">Owner</td>
          <td style="padding: 12px 0;">{{owner_name}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; font-weight: bold;">Status</td>
          <td style="padding: 12px 0;"><span style="background-color: #e0e7ff; color: #4f46e5; padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold;">{{status}}</span></td>
        </tr>
      </table>
      <div style="margin: 32px 0;">
        <a href="{{project_url}}" style="background-color: #1f2937; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Project</a>
      </div>
    `)
  },
  {
    id: "pw-pfs", category: "Patent Workflow", name: "PFS Submitted/Updated", subject: "PFS Submitted: {{project_name}}", icon: FileText,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">PFS Submission</h2>
      <p>The Patent Filing Strategy (PFS) document for <strong>{{project_name}}</strong> has been submitted for review.</p>
      <p><strong>Submitted By:</strong> {{submitter_name}}</p>
      <div style="margin: 32px 0;">
        <a href="{{review_url}}" style="background-color: #c9a84c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review PFS</a>
      </div>
    `)
  },
  {
    id: "pw-ceo", category: "Patent Workflow", name: "CEO Approval Requested", subject: "Approval Required: {{project_name}}", icon: Activity,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">Executive Approval Required</h2>
      <p>The patent application for <strong>{{project_name}}</strong> has passed all preliminary reviews and requires final CEO approval before filing.</p>
      <p><strong>Legal Counsel:</strong> {{legal_counsel_name}}</p>
      <p><strong>Priority Deadline:</strong> {{priority_date}}</p>
      <div style="margin: 32px 0;">
        <a href="{{approval_url}}" style="background-color: #ea580c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review & Approve</a>
      </div>
    `)
  },

  // ==============================
  // TRACKER MODULE
  // ==============================
  {
    id: "tm-status", category: "Tracker Module", name: "Tracker Status Changed", subject: "Status Update: {{tracker_type}}", icon: CheckCircle,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">Tracker Status Update</h2>
      <p>There has been a status change in the {{tracker_type}} tracker.</p>
      <div style="background-color: #f9fafb; padding: 16px; border-left: 4px solid #c9a84c; margin: 24px 0;">
        <p style="margin: 0;"><strong>Project:</strong> {{project_name}}</p>
        <p style="margin: 8px 0 0 0;"><strong>Previous Status:</strong> <span style="color: #6b7280; text-decoration: line-through;">{{old_status}}</span></p>
        <p style="margin: 8px 0 0 0;"><strong>New Status:</strong> <span style="color: #059669; font-weight: bold;">{{new_status}}</span></p>
      </div>
      <p><strong>Updated By:</strong> {{updated_by}}</p>
    `)
  },

  // ==============================
  // UPLOAD CENTER
  // ==============================
  {
    id: "uc-file", category: "Upload Center", name: "New File Uploaded", subject: "New File Uploaded to {{project_name}}", icon: FileOutput,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">New File Available</h2>
      <p>A new document has been uploaded to the centralized repository.</p>
      <ul style="background-color: #f3f4f6; padding: 16px 32px; border-radius: 8px; color: #374151;">
        <li><strong>File Name:</strong> {{file_name}}</li>
        <li><strong>Project:</strong> {{project_name}}</li>
        <li><strong>Uploaded By:</strong> {{uploaded_by}}</li>
        <li><strong>Date:</strong> {{upload_date}}</li>
      </ul>
      <div style="margin: 32px 0;">
        <a href="{{download_link}}" style="background-color: #1f2937; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download File</a>
      </div>
    `)
  },

  // ==============================
  // FEEDBACK MODULE
  // ==============================
  {
    id: "fm-add", category: "Feedback Module", name: "Feedback Added", subject: "New Feedback on {{project_name}}", icon: MessageSquare,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">New Feedback Submitted</h2>
      <p>New comments have been added to the active review cycle for <strong>{{project_name}}</strong>.</p>
      <div style="background-color: #f9fafb; padding: 16px; border-left: 4px solid #3b82f6; margin: 24px 0; font-style: italic; color: #4b5563;">
        "{{feedback_snippet}}"
      </div>
      <p><strong>Reviewer:</strong> {{reviewer_name}}</p>
      <div style="margin: 32px 0;">
        <a href="{{feedback_url}}" style="background-color: #3b82f6; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reply to Feedback</a>
      </div>
    `)
  },

  // ==============================
  // REPORT AUTOMATION
  // ==============================
  {
    id: "ra-exec", category: "Report Automation", name: "Automated Report Delivery", subject: "Scheduled Report: {{report_name}}", icon: BarChart3,
    html: basicWrapper(`
      <h2 style="margin-top: 0; color: #111827;">Your Automated Report</h2>
      <p>The scheduled <strong>{{report_name}}</strong> has been successfully generated.</p>
      <p><strong>Coverage Period:</strong> {{date_range}}</p>
      <p><strong>Format:</strong> {{file_format}}</p>
      
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 24px 0; display: flex; align-items: center; gap: 12px;">
        <div style="flex-grow: 1;">
          <p style="margin: 0; color: #065f46; font-weight: bold;">{{file_name}}</p>
          <p style="margin: 4px 0 0 0; color: #047857; font-size: 12px;">Generated at {{generation_time}}</p>
        </div>
        <a href="{{download_link}}" style="background-color: #10b981; color: #ffffff; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Download</a>
      </div>
      
      <p style="font-size: 12px; color: #6b7280;">You are receiving this email because you are subscribed to the {{schedule_type}} distribution list for this report.</p>
    `)
  }
];

const categories: CategoryName[] = [
  "User Management", 
  "Patent Workflow", 
  "Tracker Module", 
  "Upload Center", 
  "Feedback Module", 
  "Report Automation"
];

export default function EmailTemplatesPage() {
  const [activeTemplateId, setActiveTemplateId] = useState<string>("um-new");
  const [viewMode, setViewMode] = useState<"code" | "preview">("preview");
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );

  const activeTemplate = templates.find(t => t.id === activeTemplateId)!;
  const isEnabled = activeTemplate.status !== "disabled";

  const toggleCategory = (cat: CategoryName) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground">Notification Templates</h2>
          <p className="text-sm text-muted-foreground">Manage templates for all automated platform notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-background border border-border hover:bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all">
            <Plus className="h-4 w-4" /> Create New
          </button>
          <button className="flex items-center gap-2 bg-background border border-border hover:bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all">
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          <button className="bg-[#c9a84c] hover:bg-[#b8921e] text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-[#c9a84c]/20">
            Save Template
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Sidebar: Accordion Category List */}
        <div className="w-80 flex flex-col gap-4 shrink-0 overflow-y-auto pr-2 custom-scrollbar pb-10">
          {categories.map((category) => {
            const isExpanded = expandedCategories[category];
            const categoryTemplates = templates.filter(t => t.category === category);
            
            return (
              <div key={category} className="space-y-1">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <span>{category} ({categoryTemplates.length})</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                
                {isExpanded && (
                  <div className="space-y-1 pt-1">
                    {categoryTemplates.map((template) => {
                      const isActive = activeTemplateId === template.id;
                      const Icon = template.icon;
                      return (
                        <button
                          key={template.id}
                          onClick={() => setActiveTemplateId(template.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border",
                            isActive 
                              ? "bg-card border-border shadow-sm ring-1 ring-[#c9a84c]/20" 
                              : "bg-transparent border-transparent hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg shrink-0",
                            isActive ? "bg-[#c9a84c]/10 text-[#c9a84c]" : "bg-muted text-muted-foreground"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className={cn("text-sm font-semibold truncate", isActive ? "text-foreground" : "text-foreground/80")}>
                              {template.name}
                            </h4>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Area: Editor / Preview */}
        <div className="flex-1 flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm min-h-0">
          {/* Editor Header */}
          <div className="p-4 border-b border-border/50 bg-muted/10 shrink-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-muted rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {activeTemplate.category}
                  </span>
                  <span className="text-sm font-semibold text-foreground/50"><ArrowRight className="h-4 w-4 inline-block" /> {activeTemplate.name}</span>
                </div>
                
                <button className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border",
                  isEnabled ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                )}>
                  {isEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {isEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject Line Configuration</label>
                <input 
                  type="text" 
                  defaultValue={activeTemplate.subject} 
                  key={activeTemplate.id + "-subj"} // Force re-render on switch
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50 font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-1 rounded-lg inline-flex">
                    <button 
                      onClick={() => setViewMode("code")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                        viewMode === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Code2 className="h-3.5 w-3.5" /> HTML Template
                    </button>
                    <button 
                      onClick={() => setViewMode("preview")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                        viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" /> Visual Preview
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowPlaceholders(!showPlaceholders)}
                    className={cn(
                      "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                      showPlaceholders ? "bg-blue-500/10 text-blue-500" : "text-muted-foreground hover:text-foreground bg-muted/50"
                    )}
                  >
                    <HelpCircle className="h-3.5 w-3.5" /> Placeholders
                  </button>
                  <button className="flex items-center gap-2 text-xs font-semibold text-[#c9a84c] hover:text-[#b8921e] px-3 py-1.5 bg-[#c9a84c]/10 rounded-lg transition-colors">
                    <Send className="h-3.5 w-3.5" /> Test Payload
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-hidden relative flex">
            {/* Main Editor Area */}
            <div className="flex-1 relative">
              {viewMode === "code" ? (
                <textarea 
                  key={activeTemplate.id + "-code"} // Force re-render on switch
                  className="absolute inset-0 w-full h-full resize-none p-6 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed focus:outline-none custom-scrollbar"
                  defaultValue={activeTemplate.html}
                  spellCheck={false}
                />
              ) : (
                <div className="absolute inset-0 overflow-y-auto p-8 bg-muted/30 custom-scrollbar flex justify-center">
                  <div 
                    className="w-full max-w-[600px] shadow-sm rounded-xl overflow-hidden bg-white"
                    dangerouslySetInnerHTML={{ __html: activeTemplate.html.replace(/{{([^}]+)}}/g, '<span style="background-color: #fef08a; padding: 0 4px; border-radius: 4px; color: #854d0e; font-family: monospace; font-size: 0.9em;">$1</span>') }} 
                  />
                </div>
              )}
            </div>

            {/* Placeholders Panel */}
            {showPlaceholders && (
              <div className="w-64 shrink-0 border-l border-border bg-card overflow-y-auto custom-scrollbar p-4 space-y-4 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Available Placeholders</h4>
                  <p className="text-xs text-muted-foreground mb-4">Click to copy the placeholder for use in your template or subject line.</p>
                </div>
                
                <div className="space-y-1">
                  {[
                    "user_name", "role", "project_name", "patent_number",
                    "status", "due_date", "reviewer", "comments", "filing_number"
                  ].map(ph => (
                    <button key={ph} className="w-full flex items-center justify-between text-left p-2 rounded-md hover:bg-muted/50 group transition-colors">
                      <span className="font-mono text-xs text-[#c9a84c]">{"{{" + ph + "}}"}</span>
                      <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
