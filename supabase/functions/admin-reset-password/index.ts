// 관리자/부원장만 호출 가능. 다른 계정의 비밀번호를 강제로 재설정합니다.
// (강사 "1234 초기화" 버튼, 학생/강사 수정 폼의 비밀번호 입력 모두 이 함수를 탑니다.)
//
// ⚠️ Supabase 대시보드 "Edge Functions" 메뉴에 이 파일 내용을 그대로
// 붙여넣으면 됩니다 (다른 파일을 import하지 않는 단일 파일 구성).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireStaff(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "missing bearer token", status: 401 } as const;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return { error: "invalid token", status: 401 } as const;

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("id, role, active")
    .eq("id", userData.user.id)
    .single();
  if (profileError || !profile) return { error: "profile not found", status: 403 } as const;
  if (!profile.active || !["admin", "deputy"].includes(profile.role)) {
    return { error: "admin/deputy only", status: 403 } as const;
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  return { caller: profile, adminClient } as const;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  try {
    const auth = await requireStaff(req);
    if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);
    const { adminClient } = auth;

    const body = await req.json();
    const userId: string = body.userId;
    const newPassword: string = (body.newPassword || "").trim();

    if (!userId || newPassword.length < 4) {
      return jsonResponse({ error: "userId / newPassword(4자 이상) 필요" }, 400);
    }

    const { error: pwError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (pwError) return jsonResponse({ error: pwError.message }, 400);

    await adminClient.from("profiles").update({ must_change_password: true }).eq("id", userId);

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
