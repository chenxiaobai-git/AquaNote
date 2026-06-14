
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  phone text,
  nickname text NOT NULL DEFAULT '探索者',
  font_size text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  last_opened_at timestamptz NOT NULL DEFAULT NOW()
);

-- Water quality records
CREATE TABLE public.water_quality_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ph numeric(4,2),
  ammonia numeric(5,3),
  nitrite numeric(5,3),
  nitrate numeric(6,2),
  kh numeric(5,2),
  gh numeric(5,2),
  tds numeric(7,2),
  temperature numeric(4,1),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Organisms / biological catalog
CREATE TABLE public.organisms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  scientific_name text,
  image_url text,
  added_date date,
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Maintenance tasks / calendar
CREATE TABLE public.maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_type text NOT NULL DEFAULT '其他',
  due_date date,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Supplies / consumables
CREATE TABLE public.supplies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT '其他',
  quantity numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '个',
  threshold numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Parameter templates
CREATE TABLE public.parameter_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  param_name text NOT NULL,
  param_key text NOT NULL,
  min_value numeric(10,3),
  max_value numeric(10,3),
  unit text,
  description text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Chronicles / year book
CREATE TABLE public.chronicles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  tags text[] DEFAULT '{}',
  image_urls text[] DEFAULT '{}',
  is_milestone boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Todos
CREATE TABLE public.todos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Anonymous credential map
CREATE TABLE public.anon_credential_map (
  credential_id uuid PRIMARY KEY,
  auth_uid uuid REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Auto-sync profiles on user creation
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER organisms_updated_at BEFORE UPDATE ON public.organisms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER maintenance_tasks_updated_at BEFORE UPDATE ON public.maintenance_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER supplies_updated_at BEFORE UPDATE ON public.supplies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER parameter_templates_updated_at BEFORE UPDATE ON public.parameter_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER chronicles_updated_at BEFORE UPDATE ON public.chronicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER todos_updated_at BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_quality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chronicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anon_credential_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can CRUD own workspaces" ON public.workspaces FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can CRUD own water quality records" ON public.water_quality_records FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD own organisms" ON public.organisms FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD own maintenance tasks" ON public.maintenance_tasks FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD own supplies" ON public.supplies FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD own parameter templates" ON public.parameter_templates FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD own chronicles" ON public.chronicles FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD own todos" ON public.todos FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.water_quality_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
