/* ═══════════════════════════════════════════════════════════════════
   Model Luxe Revenue Dashboard — auth, permissions, sectioned storage

   Enforcement lives here, not in the client. A member who is not
   permitted to read a section never receives its row.
   ═══════════════════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────── profiles ── */

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'member' check (role in ('admin','member')),
  member_id   text,                       -- → a person id in data.people
  permissions jsonb not null default jsonb_build_object(
                'tabs', jsonb_build_object(
                  'rev','view', 'team','view', 'sales','edit',
                  'org','none', 'comm','own',  'charts','view',
                  'settings','none'),
                'canCloseWeek', false,
                'canManageMembers', false,
                'canResetData', false),
  status      text not null default 'invited'
                check (status in ('invited','active','disabled')),
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists profiles_member_id_key
  on public.profiles (member_id) where member_id is not null;

/* ──────────────────────────────── permission helper functions ──
   SECURITY DEFINER so they read profiles without tripping RLS
   recursion when a profiles policy calls them.                  */

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active');
$$;

create or replace function public.my_member_id() returns text
language sql stable security definer set search_path = public as $$
  select member_id from public.profiles
  where id = auth.uid() and status = 'active';
$$;

create or replace function public.perm(tab text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then 'edit'
    else coalesce(
      (select permissions->'tabs'->>tab from public.profiles
       where id = auth.uid() and status = 'active'), 'none')
  end;
$$;

create or replace function public.can_view(tab text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.perm(tab) in ('view','edit','own');
$$;

create or replace function public.can_edit(tab text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.perm(tab) = 'edit';
$$;

create or replace function public.has_cap(cap text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then true
    else coalesce(
      (select (permissions->>cap)::boolean from public.profiles
       where id = auth.uid() and status = 'active'), false)
  end;
$$;

/* section → which tab permission governs it */
create or replace function public.section_tab(section text) returns text
language sql immutable as $$
  select case section
    when 'streams' then 'rev'
    when 'people'  then 'team'
    when 'sales'   then 'sales'
    when 'org'     then 'org'
    when 'comp'    then 'comm'
    when 'history' then 'rev'
    else null
  end;
$$;

/* ──────────────────────────────────────── sectioned dashboard ── */

create table if not exists public.dashboard_sections (
  org_id     text not null default 'model-luxe',
  section    text not null check (section in
               ('meta','streams','people','sales','org','comp','history')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (org_id, section)
);

/* one row per member — this is what makes the 'own' level possible */
create table if not exists public.member_comp (
  org_id             text not null default 'model-luxe',
  member_id          text not null,
  comp_type          text not null default 'Commission Only',
  commission_plan_id text not null default '',
  override_plan_id   text not null default '',
  eligibility        jsonb not null default
                       '{"commission":true,"override":false,"companyBonus":true,
                         "kpiBonus":false,"teamPool":false}'::jsonb,
  effective_date     text not null default '',
  updated_at         timestamptz not null default now(),
  primary key (org_id, member_id)
);

create table if not exists public.payouts (
  id         text primary key,
  org_id     text not null default 'model-luxe',
  member_id  text not null,
  date       text not null,
  amount     numeric not null default 0,
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payouts_member_idx on public.payouts (org_id, member_id);

/* ─────────────────────────────────────────────────────── RLS ── */

alter table public.profiles           enable row level security;
alter table public.dashboard_sections enable row level security;
alter table public.member_comp        enable row level security;
alter table public.payouts            enable row level security;

/* profiles: see yourself; admins and member-managers see everyone */
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.has_cap('canManageMembers'));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.is_admin() or public.has_cap('canManageMembers'))
  with check (public.is_admin() or public.has_cap('canManageMembers'));

/* sections: meta readable by anyone signed in; the rest gated per tab */
drop policy if exists sections_select on public.dashboard_sections;
create policy sections_select on public.dashboard_sections for select to authenticated
  using (section = 'meta' or public.can_view(public.section_tab(section)));

drop policy if exists sections_write on public.dashboard_sections;
create policy sections_write on public.dashboard_sections for all to authenticated
  using (case when section = 'meta' then public.is_admin()
              else public.can_edit(public.section_tab(section)) end)
  with check (case when section = 'meta' then public.is_admin()
                   else public.can_edit(public.section_tab(section)) end);

/* member_comp + payouts: your own row, or full comp visibility */
drop policy if exists member_comp_select on public.member_comp;
create policy member_comp_select on public.member_comp for select to authenticated
  using (member_id = public.my_member_id() or public.perm('comm') in ('view','edit'));

drop policy if exists member_comp_write on public.member_comp;
create policy member_comp_write on public.member_comp for all to authenticated
  using (public.can_edit('comm')) with check (public.can_edit('comm'));

drop policy if exists payouts_select on public.payouts;
create policy payouts_select on public.payouts for select to authenticated
  using (member_id = public.my_member_id() or public.perm('comm') in ('view','edit'));

drop policy if exists payouts_write on public.payouts;
create policy payouts_write on public.payouts for all to authenticated
  using (public.can_edit('comm')) with check (public.can_edit('comm'));

/* ──────────────────────────────────────────────────── grants ── */

grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.profiles, public.dashboard_sections, public.member_comp, public.payouts
  to authenticated;

/* ─────────────────────────────────────── signup + timestamps ── */

/* First account created becomes the admin. Everyone after is a member
   with the default permission set above. */
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare has_admin boolean;
begin
  select exists (select 1 from public.profiles where role = 'admin') into has_admin;
  insert into public.profiles (id, email, role, status)
  values (new.id,
          coalesce(new.email, ''),
          case when has_admin then 'member' else 'admin' end,
          'active')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists sections_touch on public.dashboard_sections;
create trigger sections_touch before update on public.dashboard_sections
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

/* ─────────────────────────────────────────── seed empty rows ── */

insert into public.dashboard_sections (org_id, section, data)
values ('model-luxe','meta','{}'), ('model-luxe','streams','{}'),
       ('model-luxe','people','{}'), ('model-luxe','sales','{}'),
       ('model-luxe','org','{}'),    ('model-luxe','comp','{}'),
       ('model-luxe','history','{}')
on conflict (org_id, section) do nothing;
