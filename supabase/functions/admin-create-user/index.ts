// 관리자/부원장만 호출 가능. Auth 계정(auth.users)과 profiles/students 행을
// 함께 만듭니다. service_role 키가 필요한 작업이라 브라우저에서 직접 할 수 없어
// Edge Function으로 분리했습니다.
//
// ⚠️ Supabase 대시보드 SQL Editor가 아니라 "Edge Functions" 메뉴에서 배포하는
// 파일입니다. CLI 없이도 대시보드 코드 에디터에 이 파일 내용을 그대로
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

// 로그인 아이디(한글 포함 가능)를 Supabase Auth 이메일 형식으로 결정론적으로
// 변환합니다. app.js의 loginIdToEmail()과 반드시 같은 로직이어야 합니다.
function loginIdToEmail(loginId: string): string {
  const bytes = new TextEncoder().encode(loginId.trim());
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `u${hex}@eaglemath.local`;
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
    const role: string = body.role;
    const name: string = (body.name || "").trim();
    const loginId: string = (body.loginId || "").trim();
    const phone: string = (body.phone || "").trim();
    const password: string = (body.password || "").trim();
    const birthday4: string = (body.birthday4 || "").trim();
    const schoolYear: string = (body.schoolYear || "").trim();
    const studyPlans = Array.isArray(body.studyPlans) ? body.studyPlans : [];

    if (!["admin", "deputy", "teacher", "student"].includes(role)) {
      return jsonResponse({ error: "invalid role" }, 400);
    }
    if (!name || !loginId) return jsonResponse({ error: "name/loginId required" }, 400);
    if (role === "student" && !birthday4) {
      return jsonResponse({ error: "birthday4 required for student" }, 400);
    }

    const email = loginIdToEmail(loginId);
    const finalPassword = password || "1234";
    if (finalPassword.length < 4) return jsonResponse({ error: "password must be 4+ chars" }, 400);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { login_id: loginId, role },
    });
    if (createError || !created?.user) {
      const message = createError?.message || "";
      if (/already registered|already exists/i.test(message)) {
        return jsonResponse({ error: "이미 사용 중인 아이디입니다." }, 409);
      }
      return jsonResponse({ error: message || "계정 생성 실패" }, 400);
    }

    const userId = created.user.id;

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      role,
      name,
      login_id: loginId,
      phone: phone || null,
      active: true,
      must_change_password: role !== "admin" && role !== "deputy",
    });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      return jsonResponse({ error: profileError.message }, 400);
    }

    if (role === "student") {
      const { error: studentError } = await adminClient.from("students").insert({
        id: userId,
        birthday4,
        school_year: schoolYear || null,
        study_plans: studyPlans,
      });
      if (studentError) {
        await adminClient.auth.admin.deleteUser(userId);
        return jsonResponse({ error: studentError.message }, 400);
      }
    }

    return jsonResponse({ id: userId, loginId, role }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
