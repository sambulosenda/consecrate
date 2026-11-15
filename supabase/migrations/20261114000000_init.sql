-- Consecrate version 1 schema.
--
-- Five tables: fasts, fast_days, members, check_ins, plan_templates.
-- Every user has a Supabase auth session (anonymous on first launch), so
-- auth.uid() is always set and row-level security can key on it.
--
-- Writes that need more than one row or a secret (creating a fast, joining
-- with a code) go through security-definer functions at the bottom of this
-- file. Tables have no insert policy for those paths on purpose.

create type public.fast_type as enum ('daniel', 'partial_day', 'full_day', 'non_food');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.fasts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  church_name text not null check (char_length(btrim(church_name)) between 1 and 80),
  start_date date not null,
  length_days smallint not null check (length_days in (7, 14, 21, 40)),
  welcome_message text check (welcome_message is null or char_length(welcome_message) <= 500),
  -- Six characters from an alphabet without 0/O, 1/I/L. Keep in sync with
  -- src/lib/join-code.ts.
  join_code text not null unique check (join_code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  leader_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index fasts_leader_id_idx on public.fasts (leader_id);

create table public.fast_days (
  fast_id uuid not null references public.fasts (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 40),
  scripture_ref text not null default '' check (char_length(scripture_ref) <= 120),
  prayer_focus text not null default '' check (char_length(prayer_focus) <= 500),
  devotional text not null default '' check (char_length(devotional) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (fast_id, day_number)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  fast_id uuid not null references public.fasts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- First name only. Religious belief is special category data under UK GDPR,
  -- so this table deliberately holds nothing else that identifies a person.
  first_name text not null check (char_length(btrim(first_name)) between 1 and 40),
  fast_type public.fast_type not null,
  -- Local wall-clock time for the daily reminder; null means no reminder.
  reminder_time time,
  joined_at timestamptz not null default now(),
  unique (fast_id, user_id)
);

create index members_user_id_idx on public.members (user_id);

create table public.check_ins (
  member_id uuid not null references public.members (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 40),
  checked_in_at timestamptz not null default now(),
  primary key (member_id, day_number)
);

-- The preloaded plan, one row per day. A plan is identified by its slug.
create table public.plan_templates (
  plan_slug text not null,
  day_number smallint not null check (day_number between 1 and 40),
  scripture_ref text not null,
  prayer_focus text not null,
  devotional text not null,
  primary key (plan_slug, day_number)
);

-- ---------------------------------------------------------------------------
-- Access helpers
--
-- Security definer so policies on one table can ask about another without
-- tripping that table's own policies (and without recursing on members).
-- ---------------------------------------------------------------------------

create function public.is_fast_leader(p_fast_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fasts f
    where f.id = p_fast_id and f.leader_id = (select auth.uid())
  );
$$;

create function public.is_fast_member(p_fast_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.fast_id = p_fast_id and m.user_id = (select auth.uid())
  );
$$;

-- True when the caller may see this member's check-ins: same fast, or leader.
create function public.can_see_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.id = p_member_id
      and (public.is_fast_member(m.fast_id) or public.is_fast_leader(m.fast_id))
  );
$$;

-- True when the member row is the caller's own and the day exists in the fast.
create function public.can_check_in(p_member_id uuid, p_day_number smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    join public.fasts f on f.id = m.fast_id
    where m.id = p_member_id
      and m.user_id = (select auth.uid())
      and p_day_number between 1 and f.length_days
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.fasts enable row level security;
alter table public.fast_days enable row level security;
alter table public.members enable row level security;
alter table public.check_ins enable row level security;
alter table public.plan_templates enable row level security;

-- Start from nothing and grant only what the app uses.
revoke all on public.fasts, public.fast_days, public.members, public.check_ins, public.plan_templates
  from anon, authenticated;

-- fasts: leader and members read; leader edits the descriptive fields.
grant select on public.fasts to authenticated;
grant update (name, church_name, start_date, welcome_message) on public.fasts to authenticated;
grant delete on public.fasts to authenticated;

create policy fasts_select on public.fasts for select to authenticated
  using (leader_id = (select auth.uid()) or public.is_fast_member(id));
create policy fasts_update on public.fasts for update to authenticated
  using (leader_id = (select auth.uid()))
  with check (leader_id = (select auth.uid()));
create policy fasts_delete on public.fasts for delete to authenticated
  using (leader_id = (select auth.uid()));

-- fast_days: leader and members read; leader edits content.
grant select on public.fast_days to authenticated;
grant update (scripture_ref, prayer_focus, devotional, updated_at) on public.fast_days to authenticated;

create policy fast_days_select on public.fast_days for select to authenticated
  using (public.is_fast_leader(fast_id) or public.is_fast_member(fast_id));
create policy fast_days_update on public.fast_days for update to authenticated
  using (public.is_fast_leader(fast_id))
  with check (public.is_fast_leader(fast_id));

-- members: everyone in the fast sees first names (the group view); a member
-- edits or removes only their own row. Joining goes through join_fast().
grant select on public.members to authenticated;
grant update (first_name, fast_type, reminder_time) on public.members to authenticated;
grant delete on public.members to authenticated;

create policy members_select on public.members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_fast_member(fast_id)
    or public.is_fast_leader(fast_id)
  );
create policy members_update on public.members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy members_delete on public.members for delete to authenticated
  using (user_id = (select auth.uid()));

-- check_ins: visible within the fast; a member writes only their own. Plain
-- inserts (not an RPC) so the offline queue can replay them idempotently.
grant select, insert, delete on public.check_ins to authenticated;

create policy check_ins_select on public.check_ins for select to authenticated
  using (public.can_see_member(member_id));
create policy check_ins_insert on public.check_ins for insert to authenticated
  with check (public.can_check_in(member_id, day_number));
create policy check_ins_delete on public.check_ins for delete to authenticated
  using (public.can_check_in(member_id, day_number));

-- plan_templates: read-only reference data.
grant select on public.plan_templates to authenticated;
create policy plan_templates_select on public.plan_templates for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

create function public.generate_join_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1),
    ''
  )
  from generate_series(1, 6);
$$;

-- What someone holding a code sees before they join. Returns no rows for an
-- unknown code.
create function public.preview_fast(p_code text)
returns table (
  id uuid,
  name text,
  church_name text,
  start_date date,
  length_days smallint,
  welcome_message text
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.name, f.church_name, f.start_date, f.length_days, f.welcome_message
  from public.fasts f
  where (select auth.uid()) is not null
    and f.join_code = upper(btrim(p_code));
$$;

-- Join (or update your details in) the fast with this code.
create function public.join_fast(
  p_code text,
  p_first_name text,
  p_fast_type public.fast_type,
  p_reminder_time time default null
)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_fast_id uuid;
  v_member public.members;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select f.id into v_fast_id from public.fasts f where f.join_code = upper(btrim(p_code));
  if v_fast_id is null then
    raise exception 'no fast with that code' using errcode = 'P0002';
  end if;

  insert into public.members (fast_id, user_id, first_name, fast_type, reminder_time)
  values (v_fast_id, v_user, btrim(p_first_name), p_fast_type, p_reminder_time)
  on conflict (fast_id, user_id) do update
    set first_name = excluded.first_name,
        fast_type = excluded.fast_type,
        reminder_time = excluded.reminder_time
  returning * into v_member;

  return v_member;
end;
$$;

-- Create a fast, give it a join code and fill its days from the default plan.
-- A fast longer than the plan repeats the plan from day 1; one with no
-- matching plan day gets an empty day the leader can fill in.
create function public.create_fast(
  p_name text,
  p_church_name text,
  p_start_date date,
  p_length_days smallint,
  p_welcome_message text default null
)
returns public.fasts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_fast public.fasts;
  v_plan_length int;
  v_attempt int := 0;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.fasts (name, church_name, start_date, length_days, welcome_message, join_code, leader_id)
      values (
        btrim(p_name),
        btrim(p_church_name),
        p_start_date,
        p_length_days,
        nullif(btrim(coalesce(p_welcome_message, '')), ''),
        public.generate_join_code(),
        v_user
      )
      returning * into v_fast;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise;
      end if;
    end;
  end loop;

  select count(*) into v_plan_length from public.plan_templates where plan_slug = 'default-21';

  insert into public.fast_days (fast_id, day_number, scripture_ref, prayer_focus, devotional)
  select
    v_fast.id,
    d.day_number,
    coalesce(t.scripture_ref, ''),
    coalesce(t.prayer_focus, ''),
    coalesce(t.devotional, '')
  from generate_series(1, p_length_days::int) as d (day_number)
  left join public.plan_templates t
    on t.plan_slug = 'default-21'
   and v_plan_length > 0
   and t.day_number = ((d.day_number - 1) % v_plan_length) + 1;

  return v_fast;
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_fast_leader(uuid),
  public.is_fast_member(uuid),
  public.can_see_member(uuid),
  public.can_check_in(uuid, smallint),
  public.preview_fast(text),
  public.join_fast(text, text, public.fast_type, time),
  public.create_fast(text, text, date, smallint, text)
to authenticated;
