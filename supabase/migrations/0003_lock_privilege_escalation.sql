/* ═══════════════════════════════════════════════════════════════════
   Close a privilege escalation hole.

   The previous self-update policy let a signed-in member UPDATE their
   own profiles row, which includes `role` and `permissions`. A member
   could therefore promote themselves to admin with a single PATCH.
   Verified against the live API before this migration.

   Fix, in two layers:
     1. Column privileges — `authenticated` may only ever write
        full_name. Role, permissions, member_id and status are not
        writable over the REST API by anyone, admins included.
     2. Privileged changes move to SECURITY DEFINER functions that
        check the caller first.
   ══════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────── 1. column privileges ── */

revoke insert, update, delete on public.profiles from authenticated;
grant  update (full_name) on public.profiles to authenticated;

drop policy if exists profiles_admin_write on public.profiles;

/* Row access for the one column they may touch. */
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

/* ───────────────────────────────── 2. privileged operations ── */

/* Guards, in order:
     - caller must be an admin or hold canManageMembers
     - nobody may edit their own access, so escalation needs a second person
     - only a full admin may grant or revoke the admin role
     - the last remaining admin cannot be demoted or disabled          */
create or replace function public.set_member_access(
  p_user_id     uuid,
  p_role        text default null,
  p_permissions jsonb default null,
  p_member_id   text default null,
  p_status      text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_caller_is_admin boolean := public.is_admin();
  v_target_role text;
  v_admin_count integer;
begin
  if not (v_caller_is_admin or public.has_cap('canManageMembers')) then
    raise exception 'not permitted to manage members';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'you cannot change your own access';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role is null then
    raise exception 'no such member';
  end if;

  if (p_role is distinct from null and p_role <> v_target_role) and not v_caller_is_admin then
    raise exception 'only an admin can change a role';
  end if;

  if p_role is not null and p_role not in ('admin','member') then
    raise exception 'invalid role';
  end if;

  if p_status is not null and p_status not in ('invited','active','disabled') then
    raise exception 'invalid status';
  end if;

  /* never strand the account without an admin */
  if v_target_role = 'admin'
     and ((p_role is not null and p_role <> 'admin') or p_status = 'disabled') then
    select count(*) into v_admin_count
      from public.profiles where role = 'admin' and status = 'active';
    if v_admin_count <= 1 then
      raise exception 'this is the only admin — promote someone else first';
    end if;
  end if;

  update public.profiles set
    role        = coalesce(p_role, role),
    permissions = coalesce(p_permissions, permissions),
    member_id   = coalesce(p_member_id, member_id),
    status      = coalesce(p_status, status)
  where id = p_user_id;
end;
$$;

grant execute on function public.set_member_access(uuid,text,jsonb,text,text) to authenticated;

/* An invite is a future profile, so it needs the same rule: only a full
   admin may hand out the admin role. */
create or replace function public.create_invite(
  p_email       text,
  p_role        text default 'member',
  p_permissions jsonb default null,
  p_member_id   text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not (public.is_admin() or public.has_cap('canManageMembers')) then
    raise exception 'not permitted to invite';
  end if;

  if p_role not in ('admin','member') then
    raise exception 'invalid role';
  end if;

  if p_role = 'admin' and not public.is_admin() then
    raise exception 'only an admin can invite another admin';
  end if;

  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'a valid email is required';
  end if;

  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'that email already has an account';
  end if;

  update public.invites set revoked_at = now()
   where lower(email) = lower(trim(p_email))
     and claimed_at is null and revoked_at is null;

  v_code := public.gen_invite_code();

  insert into public.invites (email, code_hash, role, permissions, member_id, created_by)
  values (lower(trim(p_email)), public.hash_invite_code(v_code, p_email),
          p_role, coalesce(p_permissions, public.default_permissions()),
          p_member_id, auth.uid());

  return v_code;
end;
$$;

/* Invites are issued and revoked through functions, so the table itself
   needs no direct write access. */
revoke insert, update, delete on public.invites from authenticated;
