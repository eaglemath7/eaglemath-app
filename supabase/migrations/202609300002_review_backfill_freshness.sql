begin;
-- A pre-existing publication cannot complete a subsequently edited student record.
update public.academy_required_reviews rr
set lesson_id=null,teacher_id=null,teacher_at=null,director_id=null,director_at=null,updated_at=clock_timestamp()
from public.academy_items source, public.academy_items lesson
where source.id=rr.source_id and source.kind='reflection' and lesson.id=rr.lesson_id
and (source.body-'feedback') is distinct from ((lesson.body->'reflection')-'feedback');
commit;
