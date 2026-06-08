import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true }
      })
    : null;

export const supabaseSchemaSql = `
create table users (
  id uuid primary key,
  display_name text,
  created_at timestamptz default now()
);

create table games (
  id uuid primary key,
  user_id uuid references users(id),
  pgn text not null,
  metadata jsonb not null,
  imported_at timestamptz default now()
);

create table analyses (
  id uuid primary key,
  game_id uuid references games(id) on delete cascade,
  depth text not null,
  created_at timestamptz default now()
);

create table moves (
  id uuid primary key,
  game_id uuid references games(id) on delete cascade,
  fen_before text not null,
  fen_after text not null,
  played_move text not null,
  best_move text,
  eval_before integer,
  eval_after integer,
  centipawn_loss integer,
  mate_score integer,
  move_number integer,
  color text,
  phase text
);

create table mistakes (
  id uuid primary key,
  move_id uuid references moves(id) on delete cascade,
  category text not null,
  explanation text
);

create table training_sessions (
  id uuid primary key,
  user_id uuid references users(id),
  focus text not null,
  task_count integer default 0,
  created_at timestamptz default now()
);
`;
