-- Server-authoritative runtime for FranChess online games.
-- Run this migration after 202606150001_franchess_cloud.sql.

alter table public.online_games
  add column if not exists draw_offer_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists termination text;

create or replace function public.franchess_touch_online_game()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists franchess_touch_online_game on public.online_games;
create trigger franchess_touch_online_game
before update on public.online_games
for each row execute function public.franchess_touch_online_game();

create or replace function public.franchess_server_time()
returns timestamptz
language sql
volatile
as $$
  select clock_timestamp();
$$;

create or replace function public.franchess_accept_online_game(
  p_game_id uuid,
  p_profile_id uuid
)
returns public.online_games
language plpgsql
security invoker
set search_path = public
as $$
declare
  game_row public.online_games;
  initial_ms integer;
  server_now timestamptz := clock_timestamp();
begin
  select * into game_row
  from public.online_games
  where id = p_game_id
  for update;

  if game_row.id is null then
    raise exception 'Partie nicht gefunden.';
  end if;
  if game_row.status <> 'waiting' then
    return game_row;
  end if;
  if p_profile_id not in (game_row.white_profile_id, game_row.black_profile_id)
     or p_profile_id = game_row.created_by_profile_id then
    raise exception 'Diese Einladung ist nicht fuer dieses Profil bestimmt.';
  end if;

  initial_ms := coalesce(nullif(split_part(game_row.time_control, '+', 1), '')::integer, 5) * 60000;
  update public.online_games
  set status = 'active',
      clock_white_ms = initial_ms,
      clock_black_ms = initial_ms,
      last_move_at = server_now,
      draw_offer_profile_id = null,
      termination = null
  where id = game_row.id
  returning * into game_row;

  return game_row;
end;
$$;

create or replace function public.franchess_play_online_move(
  p_game_id uuid,
  p_profile_id uuid,
  p_expected_updated_at timestamptz,
  p_fen text,
  p_pgn text,
  p_move_history jsonb,
  p_status text
)
returns public.online_games
language plpgsql
security invoker
set search_path = public
as $$
declare
  game_row public.online_games;
  server_now timestamptz := clock_timestamp();
  elapsed_ms integer;
  increment_ms integer;
  white_to_move boolean;
begin
  select * into game_row
  from public.online_games
  where id = p_game_id
  for update;

  if game_row.id is null then
    raise exception 'Partie nicht gefunden.';
  end if;
  if game_row.status <> 'active' then
    raise exception 'Die Partie ist nicht aktiv.';
  end if;
  if game_row.updated_at <> p_expected_updated_at then
    raise exception 'Die Stellung wurde bereits aktualisiert.';
  end if;

  white_to_move := jsonb_array_length(game_row.move_history) % 2 = 0;
  if (white_to_move and p_profile_id <> game_row.white_profile_id)
     or (not white_to_move and p_profile_id <> game_row.black_profile_id) then
    raise exception 'Du bist nicht am Zug.';
  end if;

  elapsed_ms := greatest(0, floor(extract(epoch from (server_now - coalesce(game_row.last_move_at, server_now))) * 1000)::integer);
  increment_ms := coalesce(nullif(split_part(game_row.time_control, '+', 2), '')::integer, 0) * 1000;

  if white_to_move then
    if game_row.clock_white_ms <= elapsed_ms then
      raise exception 'Die Zeit ist bereits abgelaufen.';
    end if;
    game_row.clock_white_ms := game_row.clock_white_ms - elapsed_ms + increment_ms;
  else
    if game_row.clock_black_ms <= elapsed_ms then
      raise exception 'Die Zeit ist bereits abgelaufen.';
    end if;
    game_row.clock_black_ms := game_row.clock_black_ms - elapsed_ms + increment_ms;
  end if;

  update public.online_games
  set fen = p_fen,
      pgn = p_pgn,
      move_history = p_move_history,
      status = case when p_status = 'finished' then 'finished' else 'active' end,
      clock_white_ms = game_row.clock_white_ms,
      clock_black_ms = game_row.clock_black_ms,
      last_move_at = case when p_status = 'finished' then null else server_now end,
      draw_offer_profile_id = null,
      termination = case when p_status = 'finished' then 'normal' else null end
  where id = game_row.id
  returning * into game_row;

  return game_row;
end;
$$;

create or replace function public.franchess_claim_online_timeout(
  p_game_id uuid,
  p_pgn text
)
returns public.online_games
language plpgsql
security invoker
set search_path = public
as $$
declare
  game_row public.online_games;
  server_now timestamptz := clock_timestamp();
  elapsed_ms integer;
  white_to_move boolean;
begin
  select * into game_row
  from public.online_games
  where id = p_game_id
  for update;

  if game_row.id is null or game_row.status <> 'active' or game_row.last_move_at is null then
    return game_row;
  end if;

  elapsed_ms := greatest(0, floor(extract(epoch from (server_now - coalesce(game_row.last_move_at, server_now))) * 1000)::integer);
  white_to_move := jsonb_array_length(game_row.move_history) % 2 = 0;

  if white_to_move and game_row.clock_white_ms <= elapsed_ms then
    update public.online_games
    set status = 'finished', clock_white_ms = 0, last_move_at = null,
        pgn = p_pgn, termination = 'time forfeit', draw_offer_profile_id = null
    where id = game_row.id returning * into game_row;
  elsif not white_to_move and game_row.clock_black_ms <= elapsed_ms then
    update public.online_games
    set status = 'finished', clock_black_ms = 0, last_move_at = null,
        pgn = p_pgn, termination = 'time forfeit', draw_offer_profile_id = null
    where id = game_row.id returning * into game_row;
  end if;

  return game_row;
end;
$$;

create or replace function public.franchess_resign_online_game(
  p_game_id uuid,
  p_profile_id uuid,
  p_pgn text
)
returns public.online_games
language plpgsql
security invoker
set search_path = public
as $$
declare
  game_row public.online_games;
begin
  select * into game_row from public.online_games where id = p_game_id for update;
  if game_row.id is null then raise exception 'Partie nicht gefunden.'; end if;
  if game_row.status <> 'active' then return game_row; end if;
  if p_profile_id not in (game_row.white_profile_id, game_row.black_profile_id) then
    raise exception 'Profil ist nicht Teil dieser Partie.';
  end if;

  update public.online_games
  set status = 'finished', pgn = p_pgn, last_move_at = null,
      termination = 'resignation', draw_offer_profile_id = null
  where id = game_row.id returning * into game_row;
  return game_row;
end;
$$;

create or replace function public.franchess_draw_online_game(
  p_game_id uuid,
  p_profile_id uuid,
  p_pgn text
)
returns public.online_games
language plpgsql
security invoker
set search_path = public
as $$
declare
  game_row public.online_games;
begin
  select * into game_row from public.online_games where id = p_game_id for update;
  if game_row.id is null then raise exception 'Partie nicht gefunden.'; end if;
  if game_row.status <> 'active' then return game_row; end if;
  if p_profile_id not in (game_row.white_profile_id, game_row.black_profile_id) then
    raise exception 'Profil ist nicht Teil dieser Partie.';
  end if;

  if game_row.draw_offer_profile_id is not null
     and game_row.draw_offer_profile_id <> p_profile_id then
    update public.online_games
    set status = 'finished', pgn = p_pgn, last_move_at = null,
        termination = 'draw agreement', draw_offer_profile_id = null
    where id = game_row.id returning * into game_row;
  else
    update public.online_games
    set draw_offer_profile_id = p_profile_id
    where id = game_row.id returning * into game_row;
  end if;
  return game_row;
end;
$$;

grant execute on function public.franchess_server_time() to anon, authenticated;
grant execute on function public.franchess_accept_online_game(uuid, uuid) to anon, authenticated;
grant execute on function public.franchess_play_online_move(uuid, uuid, timestamptz, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.franchess_claim_online_timeout(uuid, text) to anon, authenticated;
grant execute on function public.franchess_resign_online_game(uuid, uuid, text) to anon, authenticated;
grant execute on function public.franchess_draw_online_game(uuid, uuid, text) to anon, authenticated;
