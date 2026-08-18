// 강사/관리자/부원장만 호출 가능. 수업 기록 화면의 "AI 문장 다듬기" 버튼이
// 이 함수를 호출해서, 사용자가 쓴 원문을 실제 Claude API로 다듬어 받아옵니다.
// (예전 buildAiSuggestion()은 원문 앞뒤에 고정 문구만 붙이는 가짜 스텁이었는데,
// 이제 진짜 AI가 자연스럽게 다시 써줍니다.)
//
// ⚠️ Supabase 대시보드 "Edge Functions" 메뉴에 이 파일 내용을 그대로
// 붙여넣으면 됩니다 (다른 파일을 import하지 않는 단일 파일 구성).
//
// 배포 전에 꼭 해야 할 일: Supabase 대시보드 > Edge Functions > Secrets 에서
// ANTHROPIC_API_KEY 라는 이름으로 Anthropic API 키를 등록해야 합니다.
// (console.anthropic.com 에서 발급받은 키를 그대로 붙여넣으면 됩니다.)
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

async function requireStaffOrTeacher(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "missing bearer token", status: 401 } as const;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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
  if (!profile.active || !["admin", "deputy", "teacher"].includes(profile.role)) {
    return { error: "강사/관리자만 사용할 수 있어요.", status: 403 } as const;
  }

  return { caller: profile } as const;
}

const SUBJECTS: Record<string, { title: string; instruction: string }> = {
  content: {
    title: "수업내용",
    instruction: "학부모가 읽기 좋은 알림장 문장으로, 오늘 배운 개념과 학생의 학습 태도가 자연스럽게 드러나게 다듬어주세요.",
  },
  assignment: {
    title: "오늘의 과제",
    instruction: "학생이 해야 할 과제를 명확하고 간결하게 정리하고, 학부모가 확인할 수 있는 문장으로 다듬어주세요.",
  },
  parentMessage: {
    title: "학부모님께 드리는 글",
    instruction: "학부모님께 전달하는 정중하고 따뜻한 문장으로 다듬어주세요. 걱정 표현은 부드럽게, 필요한 협조 사항은 구체적으로 써주세요.",
  },
  studentMessage: {
    title: "학생에게 보내는 글",
    instruction: "학생에게 직접 전하는 짧고 따뜻한 격려 문장으로 다듬어주세요. 다음 행동이 분명하게 느껴지면 좋겠습니다.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  try {
    const auth = await requireStaffOrTeacher(req);
    if ("error" in auth) return jsonResponse({ error: auth.error }, auth.status);

    const body = await req.json();
    const kind: string = (body.kind || "").trim();
    const source: string = (body.source || "").trim();
    if (!source) return jsonResponse({ error: "다듬을 원문이 없어요." }, 400);

    const subject = SUBJECTS[kind] || { title: "알림장 문장", instruction: "읽기 좋은 알림장 문장으로 다듬어주세요." };

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "ANTHROPIC_API_KEY가 설정되지 않았어요. Supabase 대시보드 > Edge Functions > Secrets에서 등록해주세요." }, 500);
    }

    const prompt = [
      "역할: 수학학원 학습 알림장을 작성하는 선생님",
      `작성 대상: ${subject.title}`,
      `요청: ${subject.instruction}`,
      "조건: 과장하지 말고, 한글 맞춤법을 자연스럽게 고치고, 2~4문장으로 작성해주세요. 원문에 없는 사실을 새로 지어내지 마세요. 완성된 문장만 출력하고, 다른 설명이나 따옴표는 붙이지 마세요.",
      "원문:",
      source,
    ].join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return jsonResponse({ error: `AI 요청 실패: ${errText.slice(0, 200)}` }, 502);
    }

    const result = await response.json();
    const text = (result?.content || [])
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("")
      .trim();

    if (!text) return jsonResponse({ error: "AI가 빈 응답을 반환했어요. 다시 시도해주세요." }, 502);

    return jsonResponse({ text, prompt }, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
