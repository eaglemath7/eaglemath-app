// Revalidate the actor before any legacy journal mutation. A stale screen is
// not evidence that its Supabase session is still authenticated.
export async function verifyRecordWriter(db, expectedId) {
  if (!expectedId) return '로그인이 필요합니다.';
  let result = await db.auth.getUser();
  if (result.error || !result.data?.user) {
    const refreshed = await db.auth.refreshSession();
    if (refreshed.error || !refreshed.data?.session) {
      return '로그인 연결이 끊겼습니다. 작성 내용은 이 창에 유지됩니다. 새 창에서 같은 주소로 로그인한 뒤 이 창에서 다시 저장해주세요.';
    }
    result = await db.auth.getUser();
  }
  if (result.error || !result.data?.user) return '로그인 상태를 확인하지 못했습니다. 작성창을 유지하고 연결 상태를 확인한 뒤 다시 저장해주세요.';
  if (result.data.user.id !== expectedId) return '다른 계정으로 로그인 상태가 변경되었습니다. 작성 내용은 유지됩니다. 원래 작성자 계정으로 다시 로그인해주세요.';
  const { data: profile, error } = await db.from('profiles').select('role,active').eq('id', expectedId).single();
  if (error) return '작성 권한을 확인하지 못했습니다. 작성 내용은 유지됩니다. 잠시 후 다시 저장해주세요.';
  if (!profile?.active || !['admin','deputy','teacher','assistant'].includes(profile.role)) return '현재 계정에는 수업기록 작성 권한이 없습니다. 담당 강사 또는 관리자 계정으로 로그인해주세요.';
  return null;
}
