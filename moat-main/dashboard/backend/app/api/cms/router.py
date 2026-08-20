from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any
from app.api import deps
from app.models.cms import (
    DashboardConfig, SidebarItem, SidebarConfig, FeatureFlag, ApplicationSetting
)
from app.schemas.cms import (
    DashboardConfigCreate, DashboardConfigResponse,
    SidebarItemCreate, SidebarItemResponse,
    SidebarConfigCreate, SidebarConfigResponse,
    FeatureFlagCreate, FeatureFlagResponse,
    ApplicationSettingCreate, ApplicationSettingResponse
)

router = APIRouter()

# Super Admin Role Check Dependency
def require_super_admin(current_user: Any = Depends(deps.get_current_user), db: Session = Depends(deps.get_db)):
    if current_user.role.role_name != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can access CMS configurations"
        )
    return current_user

# =======================
# Dashboard Config
# =======================

@router.get("/dashboard", response_model=List[DashboardConfigResponse])
def get_dashboard_configs(db: Session = Depends(deps.get_db)):
    return db.query(DashboardConfig).all()

@router.post("/dashboard", response_model=DashboardConfigResponse)
def create_dashboard_config(
    config_in: DashboardConfigCreate,
    db: Session = Depends(deps.get_db),
    admin=Depends(require_super_admin)
):
    obj = DashboardConfig(**config_in.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# =======================
# Sidebar Config
# =======================

@router.get("/sidebar-items", response_model=List[SidebarItemResponse])
def get_sidebar_items(db: Session = Depends(deps.get_db)):
    return db.query(SidebarItem).order_by(SidebarItem.display_order).all()

@router.post("/sidebar-items", response_model=SidebarItemResponse)
def create_sidebar_item(
    item_in: SidebarItemCreate,
    db: Session = Depends(deps.get_db),
    admin=Depends(require_super_admin)
):
    obj = SidebarItem(**item_in.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# =======================
# Feature Flags
# =======================

@router.get("/features", response_model=List[FeatureFlagResponse])
def get_feature_flags(db: Session = Depends(deps.get_db)):
    return db.query(FeatureFlag).all()

@router.post("/features", response_model=FeatureFlagResponse)
def create_feature_flag(
    feature_in: FeatureFlagCreate,
    db: Session = Depends(deps.get_db),
    admin=Depends(require_super_admin)
):
    obj = FeatureFlag(**feature_in.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/features/{feature_id}/toggle", response_model=FeatureFlagResponse)
def toggle_feature_flag(
    feature_id: str,
    db: Session = Depends(deps.get_db),
    admin=Depends(require_super_admin)
):
    obj = db.query(FeatureFlag).filter(FeatureFlag.id == feature_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Feature not found")
    obj.is_enabled = not obj.is_enabled
    db.commit()
    db.refresh(obj)
    return obj

# =======================
# Application Settings
# =======================

@router.get("/settings", response_model=List[ApplicationSettingResponse])
def get_app_settings(db: Session = Depends(deps.get_db)):
    return db.query(ApplicationSetting).all()

@router.post("/settings", response_model=ApplicationSettingResponse)
def create_or_update_app_setting(
    setting_in: ApplicationSettingCreate,
    db: Session = Depends(deps.get_db),
    admin=Depends(require_super_admin)
):
    obj = db.query(ApplicationSetting).filter(ApplicationSetting.setting_key == setting_in.setting_key).first()
    if obj:
        obj.setting_value = setting_in.setting_value
        obj.description = setting_in.description
    else:
        obj = ApplicationSetting(**setting_in.model_dump())
        db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
