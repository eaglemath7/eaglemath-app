// 관리자/부원장만 호출 가능. 계정(auth.users)을 완전히 삭제합니다.
// profiles/students는 auth.users를 on delete cascade로 참조하고,
// schedules/lesson_records/record_confirmations는 다시 students를 on delete
// cascade로 참조하므로, 이 함수 하나로 관련 데이터가 전부 함께 삭제됩니다.
// 되돌릴 수 없는 작업입니다 — 기록은 남기고 로그인만 막으려면 이 함수 대신
// admin-reset-password / profiles.active(또는 students.status) 변경을 쓰세요.
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

  return { caller: profile, supabaseUrl, serviceKey } as const;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  try {
    const auth = await requireStaff(req);
    if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);
    const { caller, supabaseUrl, serviceKey } = auth;

    const body = await req.json();
    const userId: string = (body.userId || "").trim();
    if (!userId) return jsonResponse({ error: "userId required" }, 400);
    if (userId === caller.id) return jsonResponse({ error: "본인 계정은 삭제할 수 없습니다." }, 400);

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
