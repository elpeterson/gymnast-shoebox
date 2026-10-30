-- Score Quiver: initial schema.
--
-- archers -> events -> rounds -> ends. One event is one Between Ends scorecard
-- (or, later, one manually entered score). Arrows are stored exactly as printed
-- ('X', '10' .. '1', 'M') so nothing is lost; numbers are derived in the app.

-- 1. Tables ------------------------------------------------------------------

create table public.archers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  archer_id uuid references public.archers(id) on delete cascade not null,
  name text not null,
  venue text,
  start_date date,
  end_date date,
  shot_on date,                -- the day actually shot (from the session label)
  session text,
  target text,
  division text,               -- raw Class/Div, e.g. 'RU13W'
  bow_style text,              -- 'recurve' | 'barebow' | 'compound' | ...
  environment text check (environment in ('indoor', 'outdoor')),
  distance_m numeric,          -- not on the card; confirmed at import
  face_cm integer,             -- not on the card; confirmed at import
  arrows_per_end smallint not null check (arrows_per_end between 1 and 12),
  bonus_labels text[] default '{}' not null,
  source text default 'betweenends' not null check (source in ('betweenends', 'manual')),
  source_path text,            -- original PDF in the 'scorecards' bucket
  source_hash text,            -- sha-256 of the PDF, to skip duplicate imports
  name_on_card text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint events_archer_source_unique unique (archer_id, source_hash)
);

create index events_archer_shot_on_idx on public.events (archer_id, shot_on desc);

create table public.rounds (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  round_number smallint not null,
  total integer not null,
  bonus integer[] default '{}' not null, -- printed bonus totals, ordered like events.bonus_labels
  constraint rounds_event_number_unique unique (event_id, round_number)
);

create table public.ends (
  id uuid default gen_random_uuid() primary key,
  round_id uuid references public.rounds(id) on delete cascade not null,
  end_number smallint not null,
  arrows text[] not null
    check (arrows <@ array['X','10','9','8','7','6','5','4','3','2','1','M']),
  constraint ends_round_number_unique unique (round_id, end_number)
);

create table public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  theme text default 'system' not null,
  updated_at timestamptz default now() not null
);

-- 2. Row Level Security --------------------------------------------------------

alter table public.archers enable row level security;
alter table public.events enable row level security;
alter table public.rounds enable row level security;
alter table public.ends enable row level security;
alter table public.user_settings enable row level security;

create policy "Users manage own archers" on public.archers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own events" on public.events
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.archers a where a.id = archer_id and a.user_id = auth.uid())
  );

create policy "Users manage own rounds" on public.rounds
  for all
  using (exists (select 1 from public.events e where e.id = rounds.event_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = rounds.event_id and e.user_id = auth.uid()));

create policy "Users manage own ends" on public.ends
  for all
  using (exists (
    select 1 from public.rounds r join public.events e on e.id = r.event_id
    where r.id = ends.round_id and e.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.rounds r join public.events e on e.id = r.event_id
    where r.id = ends.round_id and e.user_id = auth.uid()
  ));

create policy "Users manage own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Atomic import -------------------------------------------------------------
-- Writes an event with its rounds and ends in one transaction. SECURITY INVOKER,
-- so every insert still goes through the RLS policies above.
--
-- payload: { event: {...events columns...},
--            rounds: [{ round_number, total, bonus: int[], ends: [{ end_number, arrows: text[] }] }] }

create or replace function public.import_scorecard(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  ev jsonb := payload -> 'event';
  new_event_id uuid;
  new_round_id uuid;
  rnd jsonb;
  en jsonb;
begin
  insert into public.events (
    user_id, archer_id, name, venue, start_date, end_date, shot_on, session,
    target, division, bow_style, environment, distance_m, face_cm,
    arrows_per_end, bonus_labels, source, source_path, source_hash, name_on_card
  ) values (
    auth.uid(),
    (ev ->> 'archer_id')::uuid,
    ev ->> 'name',
    ev ->> 'venue',
    (ev ->> 'start_date')::date,
    (ev ->> 'end_date')::date,
    (ev ->> 'shot_on')::date,
    ev ->> 'session',
    ev ->> 'target',
    ev ->> 'division',
    ev ->> 'bow_style',
    ev ->> 'environment',
    (ev ->> 'distance_m')::numeric,
    (ev ->> 'face_cm')::integer,
    (ev ->> 'arrows_per_end')::smallint,
    coalesce(array(select jsonb_array_elements_text(ev -> 'bonus_labels')), '{}'),
    coalesce(ev ->> 'source', 'betweenends'),
    ev ->> 'source_path',
    ev ->> 'source_hash',
    ev ->> 'name_on_card'
  )
  returning id into new_event_id;

  for rnd in select * from jsonb_array_elements(payload -> 'rounds') loop
    insert into public.rounds (event_id, round_number, total, bonus)
    values (
      new_event_id,
      (rnd ->> 'round_number')::smallint,
      (rnd ->> 'total')::integer,
      coalesce(array(select (jsonb_array_elements_text(rnd -> 'bonus'))::integer), '{}')
    )
    returning id into new_round_id;

    for en in select * from jsonb_array_elements(rnd -> 'ends') loop
      insert into public.ends (round_id, end_number, arrows)
      values (
        new_round_id,
        (en ->> 'end_number')::smallint,
        array(select jsonb_array_elements_text(en -> 'arrows'))
      );
    end loop;
  end loop;

  return new_event_id;
end;
$$;

grant execute on function public.import_scorecard(jsonb) to authenticated;

-- 4. Storage: original scorecard PDFs -------------------------------------------
-- Private bucket; each user's files live under a folder named after their uid.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scorecards', 'scorecards', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "Users read own scorecards" on storage.objects
  for select using (bucket_id = 'scorecards' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload own scorecards" on storage.objects
  for insert with check (bucket_id = 'scorecards' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own scorecards" on storage.objects
  for delete using (bucket_id = 'scorecards' and (storage.foldername(name))[1] = auth.uid()::text);
