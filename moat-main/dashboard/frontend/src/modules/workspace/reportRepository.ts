import { createClient } from "@/lib/supabase/server";

export interface PfsReport {
  id: string;
  project_id: string;
  title: string;
  content: Record<string, any>;
  status: "Draft" | "Submitted" | "Reviewed" | "Approved" | "Archived";
  version: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export class ReportRepository {
  /**
   * Retrieves all report versions for a specific project
   */
  async getReportsForProject(projectId: string): Promise<PfsReport[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("pfs_reports")
      .select("*")
      .eq("project_id", projectId)
      .order("version", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Creates a new version of the report (auto-increments version)
   */
  async createReportVersion(
    projectId: string, 
    title: string, 
    content: Record<string, any>, 
    status: PfsReport["status"] = "Draft"
  ): Promise<PfsReport> {
    const supabase = await createClient();
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) throw new Error("Unauthorized");

    // Fetch latest version
    const { data: latest } = await supabase
      .from("pfs_reports")
      .select("version")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const newVersion = (latest?.version || 0) + 1;

    const { data, error } = await supabase
      .from("pfs_reports")
      .insert({
        project_id: projectId,
        title,
        content,
        status,
        version: newVersion,
        created_by: userData.user.id
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating report:", error);
      throw new Error(`Failed to create report: ${error.message}`);
    }

    // Phase 7: Workflow Hook
    // When FIRST Draft is generated -> Project Status: Active Research
    if (newVersion === 1) {
      await supabase
        .from("inventions")
        .update({ status: "Active Research" })
        .eq("id", projectId)
        .neq("status", "Active Research"); // only update if not already
    }

    return data;
  }

  /**
   * Updates an existing report status (e.g. Draft -> Submitted)
   */
  async updateReportStatus(reportId: string, status: PfsReport["status"]): Promise<PfsReport> {
    const supabase = await createClient();
    
    // Get the report to know the projectId
    const { data: report, error: fetchError } = await supabase
      .from("pfs_reports")
      .select("project_id")
      .eq("id", reportId)
      .single();
      
    if (fetchError || !report) throw new Error("Report not found");

    const { data, error } = await supabase
      .from("pfs_reports")
      .update({ status })
      .eq("id", reportId)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating report status:", error);
      throw new Error(`Failed to update report status: ${error.message}`);
    }

    // Phase 7: Workflow Hooks for Submission and Approval
    // When report is Submitted -> Project Status: Needs Review
    // When Approved -> Project Status: Finalized
    if (status === "Submitted") {
      await supabase
        .from("inventions")
        .update({ status: "Needs Review" })
        .eq("id", report.project_id);
    } else if (status === "Approved") {
      await supabase
        .from("inventions")
        .update({ status: "Finalized" })
        .eq("id", report.project_id);
    }

    return data;
  }
}
