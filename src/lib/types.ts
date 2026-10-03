export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Activity {
  id: number;
  name: string;
  category_id: number | null;
  color: string;
  goal_minutes_per_week: number | null;
  archived: number;
  pinned: number;
  created_at: string;
}

export interface Session {
  id: number;
  activity_id: number;
  start_time: string;
  end_time: string | null;
  note: string | null;
  paused_at: string | null;
  paused_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityWithRunning extends Activity {
  running_session_id: number | null;
  running_start_time: string | null;
  running_paused_at: string | null;
  running_paused_duration_seconds: number;
  running_note: string | null;
}
