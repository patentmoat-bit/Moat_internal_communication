from pydantic import BaseModel


class RoleWorkspaceResponse(BaseModel):
    role: str
    role_label: str
    workspace_route: str
    permissions: list[str]
    ai_agents: list[str]
    dashboards: list[str]
    api_scopes: list[str]
    modules: list[str]
