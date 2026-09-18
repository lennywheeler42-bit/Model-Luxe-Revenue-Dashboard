/* ═══════════════════════════════════════════════════════════════════
   Validate email addresses where invites are created.

   create_invite() only checked for an '@', so "a@b" or an address with
   a trailing space was accepted. The invite is bound to the address,
   so a malformed one produces a code nobody can ever redeem.
   ══════════════════════════════════════════════════════════════════ */

create or replace function public.valid_email(p_email text) returns boolean
language sql immutable as $$
  select p_email is not null
     and length(trim(p_email)) between 3 and 254
     and trim(p_email) ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$';
$$;

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

  if not public.valid_email(p_email) then
    raise exception 'that does not look like an email address';
  end if;

  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'that email already has an account';
  end if;

  if p_member_id is not null
     and exists (select 1 from public.profiles
                 where member_id = p_member_id and id <> auth.uid()) then
    raise exception 'that team member is already linked to another login';
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

grant execute on function public.valid_email(text) to authenticated;

/* Reject malformed addresses at the table too, so nothing can write a
   bad row by another route. */
alter table public.invites drop constraint if exists invites_email_valid;
alter table public.invites add constraint invites_email_valid
  check (public.valid_email(email));
