import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { credential_id } = await req.json();
    if (!credential_id) {
      return new Response(JSON.stringify({ error: '缺少 credential_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = `anon_${credential_id}@aquanote.app`;

    // 查找已存在的匿名用户映射
    const { data: existingMap } = await supabaseAdmin
      .from('anon_credential_map')
      .select('auth_uid')
      .eq('credential_id', credential_id)
      .maybeSingle();

    let userEmail = email;

    if (!existingMap) {
      // 创建新匿名用户
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        throw createError;
      }

      // 插入映射
      await supabaseAdmin.from('anon_credential_map').insert({
        credential_id,
        auth_uid: newUser.user!.id,
      });
    }

    // 生成魔法链接
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (linkError) throw linkError;

    return new Response(
      JSON.stringify({ hashed_token: linkData?.properties?.hashed_token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
