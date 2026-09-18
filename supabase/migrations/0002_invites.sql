/* ═══════════════════════════════════════════════════════════════════
   Invite codes — admin issues a code bound to one email address.

   The raw code is shown to the admin exactly once and never stored.
   Only its digest is kept, so a database leak yields no usable codes.
   ═══════════════════════════════════════════════════════════════ */

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  role        text not null default 'member' check (role in ('admin','member')),
  permissions jsonb not null default jsonb_build_object(
                'tabs', jsonb_build_object(
                  'rev','view', 'team','view', 'sales','edit',
                  'org','none', 'comm','own',  'charts','view',
                  'settings','none'),
                'canCloseWeek', false,
                'canManageMembers', false,
                'canResetData', false),
  member_id   text,
  expires_at  timestamptz not null default now() + interval '7 days',
  claimed_at  timestamptz,
  claimed_by  uuid references auth.users(id),
  revoked_at  timestamptz,
  attempts    integer not null default 0,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

/* at most one live invite per email */
create unique index if not exists invites_one_open_per_email
  on public.invites (lower(email))
  where claimed_at is null and revoked_at is null;

create index if not exists invites_email_idx on public.invites (lower(email));

alter table public.invites enable row level security;

/* only admins / member-managers see invites at all */
drop policy if exists invites_manage on public.invites;
create policy invites_manage on public.invites for all to authenticated
  using (public.is_admin() or public.has_cap('canManageMembers'))
  with check (public.is_admin() or public.has_cap('canManageMembers'));

grant select, insert, update, delete on public.invites to authenticated;

/* ─────────────────────────────────────────── code generation ── */

/* Unambiguous alphabet: no O/0, I/1, or similar look-alikes, because
   these codes get read off a phone screen and retyped. */
create or replace function public.gen_invite_code() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(alphabet,
      (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)) + 1, 1);
  end loop;
  return substr(result,1,4) || '-' || substr(result,5,4);
end;
$$;

/* Digest is salted with the email, so a code is only ever valid for
   the address it was issued to — the same code under another email
   produces a different hash and cannot match. */
create or replace function public.hash_invite_code(code text, email text)
returns text language sql immutable as $$
  select encode(extensions.digest(
    lower(trim(email)) || ':' || upper(trim(code)), 'sha256'), 'hex');
$$;

/* The one place the default permission set is defined, so invites and
   the profiles table cannot drift apart. */
create or replace function public.default_permissions() returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'tabs', jsonb_build_object(
      'rev','view', 'team','view', 'sales','edit',
      'org','none', 'comm','own',  'charts','view',
      'settings','none'),
    'canCloseWeek', false,
    'canManageMembers', false,
    'canResetData', false);
$$;

/* ──────────────────────────────────────────── admin: create ── */

create or replace function public.create_invite(
  p_email       text,
  p_role        text default 'member',
  p_permissions jsonb default null,
  p_member_id   text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not (public.is_admin() or public.has_cap('canManageMembers')) then
    raise exception 'not permitted to invite';
  end if;

  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'a valid email is required';
  end if;

  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'that email already has an account';
  end if;

  /* supersede any earlier unclaimed invite for this address */
  update public.invites set revoked_at = now()
   where lower(email) = lower(trim(p_email))
     and claimed_at is null and revoked_at is null;

  v_code := public.gen_invite_code();

  insert into public.invites (email, code_hash, role, permissions, member_id, created_by)
  values (lower(trim(p_email)),
          public.hash_invite_code(v_code, p_email),
          p_role,
          coalesce(p_permissions, public.default_permissions()),
          p_member_id,
          auth.uid());

  /* returned once, to the admin's screen only */
  return v_code;
end;
$$;

create or replace function public.revoke_invite(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.has_cap('canManageMembers')) then
    raise exception 'not permitted';
  end if;
  update public.invites set revoked_at = now()
   where id = p_id and claimed_at is null;
end;
$$;

revoke all on function public.gen_invite_code() from anon, authenticated;
grant execute on function public.create_invite(text,text,jsonb,text) to authenticated;
grant execute on function public.revoke_invite(uuid) to authenticated;
