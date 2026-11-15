-- Access-rule tests. Each block acts as one user and asserts what they can
-- and cannot do. Any failed assertion aborts the run with a non-zero exit.
\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),  -- leader
  ('00000000-0000-0000-0000-00000000000b'),  -- member
  ('00000000-0000-0000-0000-00000000000c'),  -- second member
  ('00000000-0000-0000-0000-00000000000d'),  -- outsider
  ('00000000-0000-0000-0000-00000000000e');  -- member who changes settings, then leaves

create table test_ctx (k text primary key, v text);
grant all on test_ctx to authenticated;

-- Leader creates a fast.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare f public.fasts;
begin
  f := public.create_fast('Sunrise 21', 'Test Church', '2027-01-04', 21::smallint, '  ');
  assert f.join_code ~ '^[A-HJKMNP-Z2-9]{6}$', 'join code has the wrong shape: ' || f.join_code;
  assert f.welcome_message is null, 'blank welcome message should be stored as null';
  assert (select count(*) from public.fast_days where fast_id = f.id) = 21, 'expected 21 days';
  assert (select scripture_ref from public.fast_days where fast_id = f.id and day_number = 1) = 'Joel 2:12–13', 'day 1 should come from the default plan';
  insert into test_ctx values ('fast_id', f.id::text), ('code', f.join_code);

  f := public.create_fast('Forty', 'Test Church', '2027-02-10', 40::smallint);
  assert (select count(*) from public.fast_days where fast_id = f.id) = 40, 'expected 40 days';
  assert (select scripture_ref from public.fast_days where fast_id = f.id and day_number = 22) = 'Joel 2:12–13', 'day 22 should repeat day 1 of the plan';
  insert into test_ctx values ('other_fast_id', f.id::text);

  begin
    perform public.create_fast('Bad', 'Test Church', '2027-01-04', 10::smallint);
    raise exception 'a 10-day fast should be rejected';
  exception when check_violation then null;
  end;
end $$;

-- Outsider: sees nothing, but can preview with the code.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$
declare v_code text := (select v from test_ctx where k = 'code');
begin
  assert (select count(*) from public.fasts) = 0, 'outsider should see no fasts';
  assert (select count(*) from public.fast_days) = 0, 'outsider should see no days';
  assert (select count(*) from public.members) = 0, 'outsider should see no members';
  assert (select count(*) from public.preview_fast(lower(v_code) || ' ')) = 1, 'preview should find the fast, ignoring case and spaces';
  assert (select count(*) from public.preview_fast('ZZZZZZ')) = 0, 'preview of an unknown code should be empty';
  begin
    perform public.join_fast('ZZZZZZ', 'Nobody', 'daniel');
    raise exception 'joining an unknown code should fail';
  exception when no_data_found then null;
  end;
  begin
    insert into public.members (fast_id, user_id, first_name, fast_type)
    values ((select v::uuid from test_ctx where k = 'fast_id'), auth.uid(), 'Sneak', 'daniel');
    raise exception 'direct insert into members should be denied';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Member joins, reads content, checks in.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare
  v_code text := (select v from test_ctx where k = 'code');
  v_fast uuid := (select v::uuid from test_ctx where k = 'fast_id');
  m public.members;
  m2 public.members;
begin
  m := public.join_fast(v_code, '  Thandi ', 'daniel', '06:30');
  assert m.first_name = 'Thandi', 'first name should be trimmed';
  m2 := public.join_fast(v_code, 'Thandi', 'non_food', null);
  assert m2.id = m.id and m2.fast_type = 'non_food', 'joining twice should update, not duplicate';
  insert into test_ctx values ('member_b', m.id::text);

  assert (select count(*) from public.fasts) = 1, 'member should see exactly their fast';
  assert (select count(*) from public.fast_days) = 21, 'member should see the 21 days of their fast';

  insert into public.check_ins (member_id, day_number) values (m.id, 1);
  insert into public.check_ins (member_id, day_number) values (m.id, 1)
    on conflict (member_id, day_number) do nothing;
  assert (select count(*) from public.check_ins where member_id = m.id) = 1, 'a repeated check-in should be a no-op';
  insert into public.check_ins (member_id, day_number) values (m.id, 2);
  delete from public.check_ins where member_id = m.id and day_number = 2;
  assert (select count(*) from public.check_ins where member_id = m.id) = 1, 'a member should be able to undo their own check-in';
  begin
    insert into public.check_ins (member_id, day_number) values (m.id, 22);
    raise exception 'checking in beyond the fast length should be denied';
  exception when insufficient_privilege then null;
  end;

  update public.fast_days set prayer_focus = 'hijack' where fast_id = v_fast;
  assert not exists (select 1 from public.fast_days where prayer_focus = 'hijack'), 'member must not edit daily content';

  begin
    update public.members set fast_id = (select v::uuid from test_ctx where k = 'other_fast_id') where id = m.id;
    raise exception 'member must not move themselves to another fast';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Second member: sees the first in the group, cannot check in for them.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$
declare
  v_code text := (select v from test_ctx where k = 'code');
  v_b uuid := (select v::uuid from test_ctx where k = 'member_b');
begin
  perform public.join_fast(v_code, 'Samuel', 'partial_day', '08:00');
  assert (select count(*) from public.members) = 2, 'members of a fast should see each other';
  assert (select count(*) from public.check_ins) = 1, 'members should see check-ins in their fast';
  begin
    insert into public.check_ins (member_id, day_number) values (v_b, 2);
    raise exception 'checking in for someone else should be denied';
  exception when insufficient_privilege then null;
  end;
  update public.members set first_name = 'Renamed' where id = v_b;
  assert (select first_name from public.members where id = v_b) = 'Thandi', 'member must not rename someone else';
  delete from public.check_ins where member_id = v_b;
  assert (select count(*) from public.check_ins) = 1, 'member must not delete someone else''s check-in';
end $$;

-- Leader: sees members and check-ins, edits content, cannot change the code.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare v_fast uuid := (select v::uuid from test_ctx where k = 'fast_id');
begin
  assert (select count(*) from public.fasts) = 2, 'leader should see both fasts they lead';
  assert (select count(*) from public.members where fast_id = v_fast) = 2, 'leader should see members';
  assert (select count(*) from public.check_ins) = 1, 'leader should see check-ins';
  update public.fast_days set prayer_focus = 'Pray for our city.' where fast_id = v_fast and day_number = 1;
  assert (select prayer_focus from public.fast_days where fast_id = v_fast and day_number = 1) = 'Pray for our city.', 'leader should be able to edit a day';
  assert (select check_ins from public.fast_check_in_counts(v_fast) where day_number = 1) = 1, 'leader should get check-in counts per day';
  begin
    update public.fasts set join_code = 'AAAAAA' where id = v_fast;
    raise exception 'join code must not be editable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Outsider again, now that there is data.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$
begin
  assert (select count(*) from public.members) = 0, 'outsider should still see no members';
  assert (select count(*) from public.check_ins) = 0, 'outsider should see no check-ins';
  assert (select count(*) from public.fast_check_in_counts((select v::uuid from test_ctx where k = 'fast_id'))) = 0, 'outsider should get no check-in counts';
end $$;

-- Settings: a member changes their own fast type and reminder, and can leave.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$
declare
  v_code text := (select v from test_ctx where k = 'code');
  v_b uuid := (select v::uuid from test_ctx where k = 'member_b');
  m public.members;
begin
  m := public.join_fast(v_code, 'Grace', 'daniel', '08:00');
  insert into public.check_ins (member_id, day_number) values (m.id, 1);

  update public.members set fast_type = 'non_food', reminder_time = null where id = m.id;
  assert (select fast_type from public.members where id = m.id) = 'non_food', 'member should change their fast type';
  assert (select reminder_time from public.members where id = m.id) is null, 'member should turn their reminder off';

  update public.members set first_name = 'Changed' where id = v_b;
  assert (select first_name from public.members where id = v_b) <> 'Changed', 'member must not change someone else''s settings';
  delete from public.members where id = v_b;
  assert exists (select 1 from public.members where id = v_b), 'member must not remove someone else';

  delete from public.members where id = m.id;
  assert (select count(*) from public.members) = 0, 'after leaving, the fast is no longer visible';
  insert into test_ctx values ('left_member', m.id::text);
end $$;
reset role;
do $$
begin
  assert not exists (select 1 from public.check_ins where member_id = (select v::uuid from test_ctx where k = 'left_member')), 'leaving should remove the member''s check-ins';
  assert (select count(*) from public.members where id = (select v::uuid from test_ctx where k = 'member_b')) = 1, 'other members are untouched';
end $$;

-- Signed-out callers get nothing at all.
reset role;
set role anon;
reset request.jwt.claim.sub;
do $$
begin
  begin
    perform public.preview_fast('AAAAAA');
    raise exception 'anon must not call preview_fast';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.fasts;
    raise exception 'anon must not read fasts';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
\echo 'access rules: all assertions passed'
