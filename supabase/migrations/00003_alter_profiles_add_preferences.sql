
-- 添加偏好设置字段
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reduce_motion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme         text    NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS language      text    NOT NULL DEFAULT 'zh-CN',
  ADD COLUMN IF NOT EXISTS is_new_user   boolean NOT NULL DEFAULT true;

-- 确保 nickname 有默认值
ALTER TABLE public.profiles ALTER COLUMN nickname SET DEFAULT '探索者';

-- font_size 保持 text 类型（已存在），确保非空
ALTER TABLE public.profiles ALTER COLUMN font_size SET DEFAULT 'medium';
ALTER TABLE public.profiles ALTER COLUMN font_size SET NOT NULL;

-- updated_at 自动更新（防止已存在时报错）
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at'
  ) THEN
    CREATE TRIGGER profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- RLS（幂等）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='用户可查看自己的档案') THEN
    CREATE POLICY "用户可查看自己的档案" ON public.profiles
      FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='用户可更新自己的档案') THEN
    CREATE POLICY "用户可更新自己的档案" ON public.profiles
      FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END;
$$;

-- handle_new_user 同步触发器（重建）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nickname', '探索者'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;
