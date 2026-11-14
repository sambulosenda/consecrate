/**
 * Hand-written to match supabase/migrations. Once the Supabase project exists
 * this file should be regenerated with `supabase gen types typescript` so it
 * can never drift from the schema.
 */
import type { FastType } from './fast-types';

type FastRow = {
  id: string;
  name: string;
  church_name: string;
  start_date: string;
  length_days: number;
  welcome_message: string | null;
  join_code: string;
  leader_id: string;
  created_at: string;
};

type FastDayRow = {
  fast_id: string;
  day_number: number;
  scripture_ref: string;
  prayer_focus: string;
  devotional: string;
  updated_at: string;
};

type MemberRow = {
  id: string;
  fast_id: string;
  user_id: string;
  first_name: string;
  fast_type: FastType;
  reminder_time: string | null;
  joined_at: string;
};

type CheckInRow = {
  member_id: string;
  day_number: number;
  checked_in_at: string;
};

type PlanTemplateRow = {
  plan_slug: string;
  day_number: number;
  scripture_ref: string;
  prayer_focus: string;
  devotional: string;
};

type Table<Row, Insert = never, Update = never> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      fasts: Table<
        FastRow,
        never,
        Partial<Pick<FastRow, 'name' | 'church_name' | 'start_date' | 'welcome_message'>>
      >;
      fast_days: Table<
        FastDayRow,
        never,
        Partial<Pick<FastDayRow, 'scripture_ref' | 'prayer_focus' | 'devotional' | 'updated_at'>>
      >;
      members: Table<
        MemberRow,
        never,
        Partial<Pick<MemberRow, 'first_name' | 'fast_type' | 'reminder_time'>>
      >;
      check_ins: Table<
        CheckInRow,
        Pick<CheckInRow, 'member_id' | 'day_number'> & Partial<Pick<CheckInRow, 'checked_in_at'>>,
        never
      >;
      plan_templates: Table<PlanTemplateRow>;
    };
    Views: Record<never, never>;
    Functions: {
      preview_fast: {
        Args: { p_code: string };
        Returns: Pick<
          FastRow,
          'id' | 'name' | 'church_name' | 'start_date' | 'length_days' | 'welcome_message'
        >[];
      };
      join_fast: {
        Args: {
          p_code: string;
          p_first_name: string;
          p_fast_type: FastType;
          p_reminder_time?: string | null;
        };
        Returns: MemberRow;
      };
      create_fast: {
        Args: {
          p_name: string;
          p_church_name: string;
          p_start_date: string;
          p_length_days: number;
          p_welcome_message?: string | null;
        };
        Returns: FastRow;
      };
    };
    Enums: { fast_type: FastType };
    CompositeTypes: Record<never, never>;
  };
};

export type Fast = FastRow;
export type FastDay = FastDayRow;
export type Member = MemberRow;
export type CheckIn = CheckInRow;
export type FastPreview = Database['public']['Functions']['preview_fast']['Returns'][number];
