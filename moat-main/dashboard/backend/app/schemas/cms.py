from pydantic import BaseModel, UUID4, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class DashboardConfigBase(BaseModel):
    role_id: UUID4
    dashboard_name: str
    widgets: List[Dict[str, Any]] = Field(default_factory=list)
    is_active: bool = True

class DashboardConfigCreate(DashboardConfigBase):
    pass

class DashboardConfigResponse(DashboardConfigBase):
    id: UUID4
    
    class Config:
        from_attributes = True

class SidebarItemBase(BaseModel):
    label: str
    icon: Optional[str] = None
    path: Optional[str] = None
    parent_id: Optional[UUID4] = None
    display_order: int = 0
    is_active: bool = True

class SidebarItemCreate(SidebarItemBase):
    pass

class SidebarItemResponse(SidebarItemBase):
    id: UUID4

    class Config:
        from_attributes = True

class SidebarConfigBase(BaseModel):
    role_id: UUID4
    sidebar_item_id: UUID4
    is_visible: bool = True

class SidebarConfigCreate(SidebarConfigBase):
    pass

class SidebarConfigResponse(SidebarConfigBase):
    id: UUID4

    class Config:
        from_attributes = True

class FeatureFlagBase(BaseModel):
    feature_key: str
    feature_name: str
    description: Optional[str] = None
    is_enabled: bool = True

class FeatureFlagCreate(FeatureFlagBase):
    pass

class FeatureFlagResponse(FeatureFlagBase):
    id: UUID4

    class Config:
        from_attributes = True

class ApplicationSettingBase(BaseModel):
    setting_key: str
    setting_value: Any
    description: Optional[str] = None

class ApplicationSettingCreate(ApplicationSettingBase):
    pass

class ApplicationSettingResponse(ApplicationSettingBase):
    id: UUID4

    class Config:
        from_attributes = True
