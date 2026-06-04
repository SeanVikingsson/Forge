-- ============================================================
-- FORGE — Fitness OS
-- Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text not null default '',
  avatar_url text,
  -- Stats
  height_cm numeric(5,1),
  weight_kg numeric(5,2),
  age integer,
  sex text check (sex in ('male', 'female')),
  -- Goals
  goal text check (goal in ('bulk', 'cut', 'recomp', 'maintenance')) default 'bulk',
  activity_level text check (activity_level in ('sedentary','lightly_active','moderately_active','very_active','extremely_active')) default 'moderately_active',
  training_days_per_week integer default 4,
  -- Targets
  tdee integer,
  calorie_target integer,
  protein_target_g integer,
  carbs_target_g integer,
  fat_target_g integer,
  -- Dietary preferences
  dietary_restrictions text[] default '{}',
  cuisine_preferences text[] default '{}',
  disliked_foods text[] default '{}',
  -- Onboarding
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can manage own profile" on public.profiles
  for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- WEIGHT LOGS
-- ============================================================
create table public.weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight_kg numeric(5,2) not null,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.weight_logs enable row level security;
create policy "Users can manage own weight logs" on public.weight_logs
  for all using (auth.uid() = user_id);

create index idx_weight_logs_user_date on public.weight_logs(user_id, date desc);

-- ============================================================
-- MEAL LOGS
-- ============================================================
create table public.meal_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')) not null,
  name text not null,
  raw_input text not null,
  calories numeric(7,1) not null default 0,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  fibre_g numeric(6,1) default 0,
  items jsonb default '[]',
  created_at timestamptz default now()
);

alter table public.meal_logs enable row level security;
create policy "Users can manage own meal logs" on public.meal_logs
  for all using (auth.uid() = user_id);

create index idx_meal_logs_user_date on public.meal_logs(user_id, date desc);

-- ============================================================
-- EXERCISES
-- ============================================================
create table public.exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  muscle_groups text[] not null default '{}',
  secondary_muscles text[] default '{}',
  equipment text not null default 'bodyweight',
  category text check (category in ('compound','isolation','cardio','stretching')) default 'compound',
  instructions text,
  created_at timestamptz default now()
);

-- Public read, admin write (RLS open for reads)
alter table public.exercises enable row level security;
create policy "Anyone can read exercises" on public.exercises
  for select using (true);

-- Seed common exercises
insert into public.exercises (name, muscle_groups, secondary_muscles, equipment, category) values
  ('Barbell Back Squat', '{"quadriceps","glutes"}', '{"hamstrings","calves","core"}', 'barbell', 'compound'),
  ('Barbell Deadlift', '{"hamstrings","glutes","lower back"}', '{"traps","forearms","core"}', 'barbell', 'compound'),
  ('Barbell Bench Press', '{"chest"}', '{"triceps","front delts"}', 'barbell', 'compound'),
  ('Barbell Overhead Press', '{"shoulders"}', '{"triceps","upper chest","core"}', 'barbell', 'compound'),
  ('Barbell Row', '{"back","lats"}', '{"biceps","rear delts","core"}', 'barbell', 'compound'),
  ('Pull-up', '{"lats","back"}', '{"biceps","rear delts"}', 'bodyweight', 'compound'),
  ('Chin-up', '{"biceps","lats"}', '{"back","rear delts"}', 'bodyweight', 'compound'),
  ('Dip', '{"triceps","chest"}', '{"front delts"}', 'bodyweight', 'compound'),
  ('Push-up', '{"chest","triceps"}', '{"front delts","core"}', 'bodyweight', 'compound'),
  ('Dumbbell Curl', '{"biceps"}', '{"forearms"}', 'dumbbell', 'isolation'),
  ('Tricep Pushdown', '{"triceps"}', '{}', 'cable', 'isolation'),
  ('Lat Pulldown', '{"lats","back"}', '{"biceps"}', 'cable', 'compound'),
  ('Cable Row', '{"back","lats"}', '{"biceps","rear delts"}', 'cable', 'compound'),
  ('Leg Press', '{"quadriceps","glutes"}', '{"hamstrings","calves"}', 'machine', 'compound'),
  ('Leg Curl', '{"hamstrings"}', '{"calves"}', 'machine', 'isolation'),
  ('Leg Extension', '{"quadriceps"}', '{}', 'machine', 'isolation'),
  ('Romanian Deadlift', '{"hamstrings","glutes"}', '{"lower back","core"}', 'barbell', 'compound'),
  ('Hip Thrust', '{"glutes"}', '{"hamstrings"}', 'barbell', 'isolation'),
  ('Incline Dumbbell Press', '{"upper chest"}', '{"triceps","front delts"}', 'dumbbell', 'compound'),
  ('Dumbbell Lateral Raise', '{"lateral delts"}', '{}', 'dumbbell', 'isolation'),
  ('Face Pull', '{"rear delts","traps"}', '{"rotator cuff"}', 'cable', 'isolation'),
  ('Plank', '{"core"}', '{"shoulders"}', 'bodyweight', 'compound'),
  ('Calf Raise', '{"calves"}', '{}', 'machine', 'isolation'),
  ('Dumbbell Row', '{"lats","back"}', '{"biceps","rear delts"}', 'dumbbell', 'compound'),
  ('Goblet Squat', '{"quadriceps","glutes"}', '{"core","hamstrings"}', 'dumbbell', 'compound'),
  ('Farmers Walk', '{"forearms","traps","core"}', '{"glutes","quadriceps"}', 'dumbbell', 'compound'),
  ('Treadmill Run', '{"cardiovascular"}', '{"quadriceps","calves"}', 'cardio machine', 'cardio'),
  ('Rowing Machine', '{"cardiovascular","back"}', '{"arms","legs"}', 'cardio machine', 'cardio');

-- ============================================================
-- WORKOUT SESSIONS
-- ============================================================
create table public.workout_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  name text,
  notes text,
  duration_minutes integer,
  created_at timestamptz default now()
);

alter table public.workout_sessions enable row level security;
create policy "Users can manage own workout sessions" on public.workout_sessions
  for all using (auth.uid() = user_id);

create index idx_workout_sessions_user_date on public.workout_sessions(user_id, date desc);

-- ============================================================
-- SESSION EXERCISES
-- ============================================================
create table public.session_exercises (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.workout_sessions(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  sets jsonb not null default '[]',
  order_index integer not null default 0,
  notes text,
  created_at timestamptz default now()
);

alter table public.session_exercises enable row level security;
create policy "Users can manage own session exercises" on public.session_exercises
  for all using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

-- ============================================================
-- BODY MEASUREMENTS
-- ============================================================
create table public.body_measurements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  chest_cm numeric(5,1),
  waist_cm numeric(5,1),
  hips_cm numeric(5,1),
  left_arm_cm numeric(5,1),
  right_arm_cm numeric(5,1),
  left_thigh_cm numeric(5,1),
  right_thigh_cm numeric(5,1),
  body_fat_pct numeric(4,1),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.body_measurements enable row level security;
create policy "Users can manage own measurements" on public.body_measurements
  for all using (auth.uid() = user_id);

-- ============================================================
-- GEMINI USAGE (server-side daily cap — mirrors Meridian pattern)
-- ============================================================
create table public.gemini_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  request_count integer not null default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.gemini_usage enable row level security;
create policy "Users can read own usage" on public.gemini_usage
  for select using (auth.uid() = user_id);
-- Server-side route handlers use service role key to upsert

-- ============================================================
-- UPDATED_AT trigger for profiles
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
