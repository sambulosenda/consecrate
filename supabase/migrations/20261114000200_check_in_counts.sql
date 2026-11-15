-- Check-ins per day for a fast, for the leader's view. Counted in the database
-- so a large congregation never means downloading thousands of rows. Visible to
-- the fast's leader and members; anyone else gets no rows.

create function public.fast_check_in_counts(p_fast_id uuid)
returns table (day_number smallint, check_ins bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.day_number, count(*)
  from public.check_ins c
  join public.members m on m.id = c.member_id
  where m.fast_id = p_fast_id
    and (public.is_fast_leader(p_fast_id) or public.is_fast_member(p_fast_id))
  group by c.day_number
  order by c.day_number;
$$;

revoke execute on function public.fast_check_in_counts(uuid) from public, anon;
grant execute on function public.fast_check_in_counts(uuid) to authenticated;
