/**
 * Every call the app makes to the backend, in one place. Screens use the
 * hooks in queries.ts and never touch the Supabase client directly.
 */
import type { Fast, FastDay, FastPreview, Member } from './database.types';
import type { FastLength, FastType } from './fast-types';
import { ensureSession, supabase } from './supabase';

/** The fast behind a join code, or null if no fast has that code. */
export async function previewFast(code: string): Promise<FastPreview | null> {
  await ensureSession();
  const { data, error } = await supabase().rpc('preview_fast', { p_code: code });
  if (error) throw error;
  return data[0] ?? null;
}

export type JoinFastInput = {
  code: string;
  firstName: string;
  fastType: FastType;
  /** 'HH:MM' in the member's local time, or null for no reminder. */
  reminderTime: string | null;
};

export async function joinFast(input: JoinFastInput): Promise<Member> {
  await ensureSession();
  const { data, error } = await supabase().rpc('join_fast', {
    p_code: input.code,
    p_first_name: input.firstName,
    p_fast_type: input.fastType,
    p_reminder_time: input.reminderTime,
  });
  if (error) throw error;
  return data;
}

export type CreateFastInput = {
  name: string;
  churchName: string;
  startDate: string;
  lengthDays: FastLength;
  welcomeMessage: string | null;
};

export async function createFast(input: CreateFastInput): Promise<Fast> {
  await ensureSession();
  const { data, error } = await supabase().rpc('create_fast', {
    p_name: input.name,
    p_church_name: input.churchName,
    p_start_date: input.startDate,
    p_length_days: input.lengthDays,
    p_welcome_message: input.welcomeMessage,
  });
  if (error) throw error;
  return data;
}

export type MyFast = {
  fast: Fast;
  /** This device's membership, if it has joined as a member. */
  member: Member | null;
  isLeader: boolean;
};

/**
 * Every fast this device leads or has joined, newest start date first. Row
 * level security already limits `fasts` to exactly those, so there is no
 * filter here beyond matching up the caller's own member rows.
 */
export async function listMyFasts(): Promise<MyFast[]> {
  const userId = await ensureSession();
  const [fasts, members] = await Promise.all([
    supabase().from('fasts').select('*').order('start_date', { ascending: false }),
    supabase().from('members').select('*').eq('user_id', userId),
  ]);
  if (fasts.error) throw fasts.error;
  if (members.error) throw members.error;

  const memberByFast = new Map(members.data.map((m) => [m.fast_id, m]));
  return fasts.data.map((fast) => ({
    fast,
    member: memberByFast.get(fast.id) ?? null,
    isLeader: fast.leader_id === userId,
  }));
}

export async function getMyFast(fastId: string): Promise<MyFast | null> {
  const all = await listMyFasts();
  return all.find((f) => f.fast.id === fastId) ?? null;
}

export async function getFastDay(fastId: string, dayNumber: number): Promise<FastDay | null> {
  await ensureSession();
  const { data, error } = await supabase()
    .from('fast_days')
    .select('*')
    .eq('fast_id', fastId)
    .eq('day_number', dayNumber)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function countMembers(fastId: string): Promise<number> {
  await ensureSession();
  const { count, error } = await supabase()
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('fast_id', fastId);
  if (error) throw error;
  return count ?? 0;
}

export async function listFastDays(fastId: string): Promise<FastDay[]> {
  await ensureSession();
  const { data, error } = await supabase()
    .from('fast_days')
    .select('*')
    .eq('fast_id', fastId)
    .order('day_number');
  if (error) throw error;
  return data;
}

export type FastDayContent = Pick<FastDay, 'scripture_ref' | 'prayer_focus' | 'devotional'>;

/** Leader only; the database rejects anyone else. */
export async function updateFastDay(
  fastId: string,
  dayNumber: number,
  content: FastDayContent,
): Promise<FastDay> {
  await ensureSession();
  const { data, error } = await supabase()
    .from('fast_days')
    .update({ ...content, updated_at: new Date().toISOString() })
    .eq('fast_id', fastId)
    .eq('day_number', dayNumber)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** The day numbers this member has checked in on. */
export async function listCheckedDays(memberId: string): Promise<number[]> {
  await ensureSession();
  const { data, error } = await supabase()
    .from('check_ins')
    .select('day_number')
    .eq('member_id', memberId)
    .order('day_number');
  if (error) throw error;
  return data.map((row) => row.day_number);
}

/** Safe to repeat: checking in twice for a day is a no-op. */
export async function checkIn(memberId: string, dayNumber: number): Promise<void> {
  await ensureSession();
  const { error } = await supabase()
    .from('check_ins')
    .upsert(
      { member_id: memberId, day_number: dayNumber },
      { onConflict: 'member_id,day_number', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function undoCheckIn(memberId: string, dayNumber: number): Promise<void> {
  await ensureSession();
  const { error } = await supabase()
    .from('check_ins')
    .delete()
    .eq('member_id', memberId)
    .eq('day_number', dayNumber);
  if (error) throw error;
}

export type GroupMember = {
  id: string;
  firstName: string;
  /** When they checked in for the day asked about, or null if not yet. */
  checkedInAt: string | null;
};

/** Everyone in the fast, with whether they have checked in on the given day. */
export async function listGroup(fastId: string, dayNumber: number): Promise<GroupMember[]> {
  await ensureSession();
  const members = await supabase()
    .from('members')
    .select('id, first_name')
    .eq('fast_id', fastId)
    .order('first_name');
  if (members.error) throw members.error;
  if (members.data.length === 0) return [];

  const checkIns = await supabase()
    .from('check_ins')
    .select('member_id, checked_in_at')
    .eq('day_number', dayNumber)
    .in('member_id', members.data.map((m) => m.id));
  if (checkIns.error) throw checkIns.error;

  const timeByMember = new Map(checkIns.data.map((c) => [c.member_id, c.checked_in_at]));
  return members.data.map((m) => ({
    id: m.id,
    firstName: m.first_name,
    checkedInAt: timeByMember.get(m.id) ?? null,
  }));
}

/** A sentence a person can act on, whatever went wrong underneath. */
export function describeError(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/network|fetch|timed? ?out/i.test(message)) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (/no fast with that code/i.test(message)) {
    return 'No fast has that code. Check it with your leader and try again.';
  }
  if (/not configured/i.test(message)) return message;
  return 'Something went wrong. Please try again.';
}
