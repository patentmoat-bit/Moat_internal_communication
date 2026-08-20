import { ModuleWorkbench } from "@/components/modules/ModuleWorkbench";

export default function Page() {
  return (
    <ModuleWorkbench
      index={3}
      title="Project Management"
      status="ready"
      summary="Project-level planning for patent workflows, ownership, deadlines, status tracking, and workspace-scoped execution."
      inputs={["Workspace", "Project brief", "Owner", "Due date", "Status"]}
      outputs={["Project board", "Task state", "Owner assignments", "Activity events"]}
      engines={["Project CRUD", "Workspace authorization", "Status transitions", "Activity capture"]}
      api="POST /api/v1/workspaces/{id}/projects"
      data={["workspaces", "workspace_projects", "workspace_members"]}
    />
  );
}
