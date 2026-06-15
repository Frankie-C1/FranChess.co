-- FranChess.co username-based sync schema.
-- This intentionally does not use Supabase Auth. The anon policies below are
-- permissive because a username is a sync key, not an authentication factor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (char_length(username) between 3 and 32),
  chesscom_username text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.user_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  dark_mode boolean not null default true,
  color_theme text not null default 'standard',
  board_theme text not null default 'auto',
  layout_mode text not null default 'auto',
  engine_elo text not null default '1200',
  show_legal_moves boolean not null default true,
  other_settings jsonb not null default '{}'::jsonb
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'pgn',
  pgn text not null,
  white text,
  black text,
  result text,
  date text,
  time_control text,
  opening text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists games_profile_created_idx on public.games (profile_id, created_at desc);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  analysis_json jsonb not null default '[]'::jsonb,
  accuracy_white numeric,
  accuracy_black numeric,
  estimated_elo_white integer,
  estimated_elo_black integer,
  created_at timestamptz not null default now(),
  unique (profile_id, game_id)
);

create table if not exists public.training_progress (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.puzzle_progress (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  puzzle_id text not null,
  solved boolean not null default false,
  attempts integer not null default 0,
  last_seen timestamptz not null default now(),
  primary key (profile_id, puzzle_id)
);

create table if not exists public.opening_progress (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opening_id text not null,
  progress_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (profile_id, opening_id)
);

create table if not exists public.online_games (
  id uuid primary key default gen_random_uuid(),
  white_profile_id uuid not null references public.profiles(id) on delete cascade,
  black_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  white_username text,
  black_username text,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'declined')),
  time_control text not null,
  pgn text not null default '',
  fen text not null,
  move_history jsonb not null default '[]'::jsonb,
  clock_white_ms integer not null default 300000,
  clock_black_ms integer not null default 300000,
  last_move_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (white_profile_id <> black_profile_id)
);
create index if not exists online_games_white_idx on public.online_games (white_profile_id, updated_at desc);
create index if not exists online_games_black_idx on public.online_games (black_profile_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.games enable row level security;
alter table public.analyses enable row level security;
alter table public.training_progress enable row level security;
alter table public.puzzle_progress enable row level security;
alter table public.opening_progress enable row level security;
alter table public.online_games enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','user_settings','games','analyses','training_progress','puzzle_progress','opening_progress','online_games']
  loop
    execute format('drop policy if exists "username sync public access" on public.%I', table_name);
    execute format('create policy "username sync public access" on public.%I for all to anon, authenticated using (true) with check (true)', table_name);
  end loop;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.online_games;
exception
  when duplicate_object then null;
end $$;
