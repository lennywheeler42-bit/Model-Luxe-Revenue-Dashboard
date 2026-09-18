/* ═══════════════════════════════════════════════════════════════════
   Admin-issued password resets.

   There is no transactional email on this project, so the usual reset
   link is not available. An admin issues a short-lived code bound to
   one account instead, exactly like an invite.

   The code is stored only as a digest salted with the email, so the
   same code cannot be replayed against a different account.
   ══════════════════════════════════════════════════════════════════ */

create table if not exists public.password_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  code_hash  text not null,
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at    timestamptz,
  revoked_at timestamptz,
  attempts   integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists password_resets_one_open_per_user
  on public.password_resets (user_id)
  where used_at is null and revoked_at is null;

create index if not exists password_resets_email_idx
  on public.password_resets (lower(email));

alter table public.password_resets enable row level security;

drop policy if exists password_resets_manage on public.password_resets;
create policy password_resets_manage on public.password_resets for select to authenticated
  using (public.is_admin() or public.has_cap('canManageMembers'));

grant select on public.password_resets to authenticated;

/* Guards:
     - caller must be an admin or hold canManageMembers
     - only a full admin may reset another admin's password, otherwise a
       member-manager could seize the admin account outright
     - resetting your own password here is pointless and is refused;
       a signed-in user changes their own password directly          */
create or replace function public.create_password_reset(p_user_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_email text;
  v_target_role text;
begin
  if not (public.is_admin() or public.has_cap('canManageMembers')) then
    raise exception 'not permitted to reset passwords';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'change your own password from your account instead';
  end if;

  select email, role into v_email, v_target_role
    from public.profiles where id = p_user_id;

  if v_email is null then
    raise exception 'no such member';
  end if;

  if v_target_role = 'admin' and not public.is_admin() then
    raise exception 'only an admin can reset another admin''s password';
  end if;

  update public.password_resets set revoked_at = now()
   where user_id = p_user_id and used_at is null and revoked_at is null;

  v_code := public.gen_invite_code();

  insert into public.password_resets (user_id, email, code_hash, created_by)
  values (p_user_id, lower(v_email), public.hash_invite_code(v_code, v_email), auth.uid());

  return v_code;
end;
$$;

create or replace function public.revoke_password_reset(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.has_cap('canManageMembers')) then
    raise exception 'not permitted';
  end if;
  update public.password_resets set revoked_at = now()
   where id = p_id and used_at is null;
end;
$$;

grant execute on function public.create_password_reset(uuid) to authenticated;
grant execute on function public.revoke_password_reset(uuid) to authenticated;
