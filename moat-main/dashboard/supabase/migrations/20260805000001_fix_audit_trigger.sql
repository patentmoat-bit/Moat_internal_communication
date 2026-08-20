CREATE OR REPLACE FUNCTION public.log_invention_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_text text;
  actor_id uuid := auth.uid();
  new_json jsonb;
  old_json jsonb;
BEGIN
  IF actor_id IS NULL THEN
      RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      new_json := row_to_json(NEW)::jsonb - 'password' - 'service_role_key';
  END IF;
  
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
      old_json := row_to_json(OLD)::jsonb - 'password' - 'service_role_key';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'project', NEW.id, 'CREATE', 'Created new project: ' || NEW.title);
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, after_data)
    VALUES (actor_id, actor_id, 'CREATE', 'project', NEW.id, new_json);
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'project', NEW.id, 'UPDATE', 'Updated project status');
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data, after_data)
    VALUES (actor_id, actor_id, 'UPDATE', 'project', NEW.id, old_json, new_json);
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'project', OLD.id, 'DELETE', 'Deleted project');
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data)
    VALUES (actor_id, actor_id, 'DELETE', 'project', OLD.id, old_json);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_trademark_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_text text;
  actor_id uuid := auth.uid();
  new_json jsonb;
  old_json jsonb;
BEGIN
  IF actor_id IS NULL THEN
      RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      new_json := row_to_json(NEW)::jsonb - 'password' - 'service_role_key';
  END IF;
  
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
      old_json := row_to_json(OLD)::jsonb - 'password' - 'service_role_key';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'trademark', NEW.id, 'CREATE', 'Created new trademark: ' || NEW.name);
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, after_data)
    VALUES (actor_id, actor_id, 'CREATE', 'trademark', NEW.id, new_json);
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'trademark', NEW.id, 'UPDATE', 'Updated trademark status');
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data, after_data)
    VALUES (actor_id, actor_id, 'UPDATE', 'trademark', NEW.id, old_json, new_json);
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'trademark', OLD.id, 'DELETE', 'Deleted trademark');
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data)
    VALUES (actor_id, actor_id, 'DELETE', 'trademark', OLD.id, old_json);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;
