// 형제자매 바꾸기: 학생으로 로그인한 상태에서, 같은 학부모에 연결된 형제자매 계정으로 바로 전환합니다.
// 비밀번호를 다시 묻지 않고, 서버에서 형제자매 관계를 확인한 뒤 그 학생의 로그인 세션을 만들어 돌려줍니다.
// 배포: Supabase 대시보드 > Edge Functions > 새 함수 이름 academy-sibling-switch (Verify JWT 끄기)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!, anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "로그인이 필요합니다" }, 401);
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: who } = await anon.auth.getUser(token);
    if (!who?.user) return json({ error: "로그인이 필요합니다" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const targetId = String((await req.json()).studentId || "");
    const { data: people } = await admin.from("profiles").select("id, role, active").in("id", [who.user.id, targetId]);
    const me = people?.find((p) => p.id === who.user.id), target = people?.find((p) => p.id === targetId);
    if (!me?.active || me.role !== "student" || !target?.active || target.role !== "student") return json({ error: "형제자매 계정을 확인할 수 없어요" }, 403);

    // 같은 학부모에 함께 연결돼 있어야 형제자매로 인정
    const { data: links } = await admin.from("parent_students").select("parent_id, student_id").in("student_id", [me.id, target.id]);
    const parentsOf = (id: string) => new Set((links || []).filter((l) => l.student_id === id).map((l) => l.parent_id));
    const mine = parentsOf(me.id);
    if (![...parentsOf(target.id)].some((p) => mine.has(p))) return json({ error: "같은 가족으로 연결된 형제자매만 바꿀 수 있어요" }, 403);

    // 비밀번호 없이 대상 학생의 세션 발급 (메일은 보내지 않음)
    const { data: u } = await admin.auth.admin.getUserById(target.id);
    if (!u?.user?.email) return json({ error: "계정 정보를 찾을 수 없어요" }, 404);
    const { data: link, error: le } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
    if (le || !link?.properties?.hashed_token) return json({ error: "전환하지 못했어요" }, 500);
    const { data: v, error: ve } = await anon.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
    if (ve || !v.session) return json({ error: "전환하지 못했어요" }, 500);
    return json({ session: { access_token: v.session.access_token, refresh_token: v.session.refresh_token } });
  } catch (err) {
    console.error(err);
    return json({ error: "전환 중 오류가 발생했어요" }, 500);
  }
});
