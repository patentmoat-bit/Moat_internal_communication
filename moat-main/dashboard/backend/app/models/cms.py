from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, JSON, DateTime, Text, text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class DashboardConfig(Base):
    __tablename__ = "dashboard_config"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"))
    dashboard_name = Column(String(255), nullable=False)
    widgets = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)

class SidebarItem(Base):
    __tablename__ = "sidebar_items"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    label = Column(String(255), nullable=False)
    icon = Column(String(255))
    path = Column(String(255))
    parent_id = Column(UUID(as_uuid=True), ForeignKey("sidebar_items.id", ondelete="CASCADE"))
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

class SidebarConfig(Base):
    __tablename__ = "sidebar_config"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"))
    sidebar_item_id = Column(UUID(as_uuid=True), ForeignKey("sidebar_items.id", ondelete="CASCADE"))
    is_visible = Column(Boolean, default=True)

class FeatureFlag(Base):
    __tablename__ = "feature_flags"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    feature_key = Column(String(255), unique=True, nullable=False)
    feature_name = Column(String(255), nullable=False)
    description = Column(Text)
    is_enabled = Column(Boolean, default=True)

class FeaturePermission(Base):
    __tablename__ = "feature_permissions"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"))
    feature_id = Column(UUID(as_uuid=True), ForeignKey("feature_flags.id", ondelete="CASCADE"))
    has_access = Column(Boolean, default=True)

class WorkflowMaster(Base):
    __tablename__ = "workflow_master"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    workflow_name = Column(String(255), unique=True, nullable=False)
    module = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

class WorkflowStep(Base):
    __tablename__ = "workflow_steps"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflow_master.id", ondelete="CASCADE"))
    step_name = Column(String(255), nullable=False)
    step_order = Column(Integer, nullable=False)
    responsible_role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="SET NULL"))
    status_color = Column(String(50), default="#000000")

class ApplicationSetting(Base):
    __tablename__ = "application_settings"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    setting_key = Column(String(255), unique=True, nullable=False)
    setting_value = Column(JSON)
    description = Column(Text)

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    template_key = Column(String(255), unique=True, nullable=False)
    subject = Column(String(255), nullable=False)
    body_content = Column(Text, nullable=False)
    trigger_event = Column(String(255))
    is_active = Column(Boolean, default=True)
