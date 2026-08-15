begin;

alter table public.competitions
  add column if not exists mso_meet_id text,
  add column if not exists notes text;

create unique index if not exists competitions_gymnast_mso_meet_uidx
  on public.competitions (gymnast_id, mso_meet_id)
  where mso_meet_id is not null;

create index if not exists competitions_gymnast_date_idx
  on public.competitions (gymnast_id, start_date desc);

create index if not exists competitions_user_id_idx
  on public.competitions (user_id);

create index if not exists gymnasts_user_id_idx
  on public.gymnasts (user_id);

revoke all on public.gymnasts from anon;
revoke all on public.competitions from anon;
revoke all on public.scores from anon;
revoke all on public.competitions_with_scores from anon;

drop policy if exists "Users can view own gymnasts" on public.gymnasts;
drop policy if exists "Users can insert own gymnasts" on public.gymnasts;
drop policy if exists "Users can update own gymnasts" on public.gymnasts;
drop policy if exists "Users can delete own gymnasts" on public.gymnasts;

create policy "Users can view own gymnasts"
  on public.gymnasts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own gymnasts"
  on public.gymnasts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own gymnasts"
  on public.gymnasts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own gymnasts"
  on public.gymnasts for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own competitions" on public.competitions;
drop policy if exists "Users can insert own competitions" on public.competitions;
drop policy if exists "Users can update own competitions" on public.competitions;
drop policy if exists "Users can delete own competitions" on public.competitions;

create policy "Users can view own competitions"
  on public.competitions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own competitions"
  on public.competitions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own competitions"
  on public.competitions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own competitions"
  on public.competitions for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own scores" on public.scores;
drop policy if exists "Users can insert own scores" on public.scores;
drop policy if exists "Users can update own scores" on public.scores;
drop policy if exists "Users can delete own scores" on public.scores;

create policy "Users can view own scores"
  on public.scores for select to authenticated
  using (exists (
    select 1 from public.competitions c
    where c.id = scores.competition_id
      and c.user_id = (select auth.uid())
  ));
create policy "Users can insert own scores"
  on public.scores for insert to authenticated
  with check (exists (
    select 1 from public.competitions c
    where c.id = scores.competition_id
      and c.user_id = (select auth.uid())
  ));
create policy "Users can update own scores"
  on public.scores for update to authenticated
  using (exists (
    select 1 from public.competitions c
    where c.id = scores.competition_id
      and c.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.competitions c
    where c.id = scores.competition_id
      and c.user_id = (select auth.uid())
  ));
create policy "Users can delete own scores"
  on public.scores for delete to authenticated
  using (exists (
    select 1 from public.competitions c
    where c.id = scores.competition_id
      and c.user_id = (select auth.uid())
  ));

create or replace view public.competitions_with_scores
with (security_invoker = true)
as
select
  c.id,
  c.user_id,
  c.gymnast_id,
  c.name,
  c.start_date,
  c.end_date,
  c.level,
  c.all_around_place,
  c.created_at,
  coalesce(
    (
      select json_agg(
        json_build_object(
          'apparatus', s.apparatus,
          'value', s.value,
          'start_value', s.start_value,
          'place', s.place
        ) order by s.apparatus
      )
      from public.scores s
      where s.competition_id = c.id
    ),
    '[]'::json
  ) as scores,
  (
    select sum(s.value)
    from public.scores s
    where s.competition_id = c.id
  ) as all_around_score,
  c.mso_meet_id,
  c.notes
from public.competitions c;

grant select, insert, update, delete on public.gymnasts to authenticated;
grant select, insert, update, delete on public.competitions to authenticated;
grant select, insert, update, delete on public.scores to authenticated;
grant select on public.competitions_with_scores to authenticated;

create or replace function public.save_competition(
  p_competition_id uuid,
  p_gymnast_id uuid,
  p_name text,
  p_level text,
  p_start_date date,
  p_end_date date,
  p_all_around_place integer,
  p_notes text,
  p_mso_meet_id text,
  p_scores jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_competition_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.gymnasts
    where id = p_gymnast_id and user_id = v_user_id
  ) then
    raise exception 'Gymnast profile not found';
  end if;

  if p_competition_id is null then
    insert into public.competitions (
      user_id, gymnast_id, name, level, start_date, end_date,
      all_around_place, notes, mso_meet_id
    ) values (
      v_user_id, p_gymnast_id, p_name, p_level, p_start_date, p_end_date,
      p_all_around_place, p_notes, p_mso_meet_id
    )
    returning id into v_competition_id;
  else
    update public.competitions
    set name = p_name,
        level = p_level,
        start_date = p_start_date,
        end_date = p_end_date,
        all_around_place = p_all_around_place,
        notes = p_notes,
        mso_meet_id = coalesce(p_mso_meet_id, mso_meet_id),
        updated_at = now()
    where id = p_competition_id and user_id = v_user_id
    returning id into v_competition_id;

    if v_competition_id is null then
      raise exception 'Competition not found';
    end if;
  end if;

  delete from public.scores where competition_id = v_competition_id;

  insert into public.scores (
    competition_id, apparatus, value, place, start_value
  )
  select
    v_competition_id,
    item->>'apparatus',
    nullif(item->>'value', '')::numeric,
    nullif(item->>'place', '')::integer,
    nullif(item->>'start_value', '')::numeric
  from jsonb_array_elements(coalesce(p_scores, '[]'::jsonb)) item
  where item->>'apparatus' in (
    'vault', 'uneven_bars', 'balance_beam', 'floor_exercise',
    'pommel_horse', 'still_rings', 'parallel_bars', 'high_bar'
  )
  and (
    item->>'value' is not null
    or item->>'place' is not null
    or item->>'start_value' is not null
  );

  return v_competition_id;
end;
$$;

revoke all on function public.save_competition(
  uuid, uuid, text, text, date, date, integer, text, text, jsonb
) from public, anon;
grant execute on function public.save_competition(
  uuid, uuid, text, text, date, date, integer, text, text, jsonb
) to authenticated;

commit;
