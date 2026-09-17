-- Rankings are visible to students and staff only, never parent accounts.
create or replace function public.academy_ranking(p_months integer default 1,p_start date default null,p_end date default null) returns table(student_id uuid,display_name text,school_group text,total bigint,place bigint)
language sql stable security definer set search_path=public as $$
 with totals as (
 select s.id,p.name,left(coalesce(s.school_year,'미'),1) grp,coalesce(sum(a.points),0)::bigint total
 from students s join profiles p on p.id=s.id and p.active
 left join academy_points a on a.student_id=s.id and a.earned_at>=coalesce(p_start::timestamptz,now()-make_interval(months=>greatest(1,least(p_months,6)))) and a.earned_at<coalesce((p_end+1)::timestamptz,now())
 where (academy_staff() or academy_role()='student') group by s.id,p.name,s.school_year
 ), ranked as (select *,rank() over(partition by grp order by total desc) pos from totals)
 select id,case when academy_staff() or id=auth.uid() then name else left(name,1)||repeat('○',greatest(length(name)-1,1)) end,grp,total,pos from ranked where academy_staff() or pos<=5 or id=auth.uid() order by grp,pos;
$$;
