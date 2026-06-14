
-- 管理员邮箱表
CREATE TABLE public.admin_emails (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  added_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS：完全禁止前端直接访问（仅通过 service_role 操作）
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- 只允许认证用户查看自己是否是管理员（单行）
CREATE POLICY "自查管理员身份" ON public.admin_emails
  FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 系统配置表（存储全局设置）
CREATE TABLE public.system_config (
  key   text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员可读系统配置" ON public.system_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 系统操作日志
CREATE TABLE public.admin_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email  text NOT NULL,
  action       text NOT NULL,
  target       text,
  detail       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员可读写日志" ON public.admin_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_emails
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
