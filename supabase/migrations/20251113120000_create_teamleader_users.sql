-- Teamleader integration support

create table if not exists public.teamleader_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  teamleader_user_id text not null unique,
  user_info jsonb not null,
  access_token text,
  refresh_token text,
  scope text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.teamleader_users enable row level security;

create policy "Teamleader users can view own integration"
  on public.teamleader_users for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Teamleader users can update own integration"
  on public.teamleader_users for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Teamleader users can delete own integration"
  on public.teamleader_users for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.update_teamleader_users_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_teamleader_users_updated_at
  before update on public.teamleader_users
  for each row
  execute function public.update_teamleader_users_updated_at();

create index if not exists teamleader_users_teamleader_user_id_idx
  on public.teamleader_users (teamleader_user_id);

