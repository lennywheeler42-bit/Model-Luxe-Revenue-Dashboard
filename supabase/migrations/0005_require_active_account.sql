/* ═══════════════════════════════════════════════════════════════════
   Require an active account for every read.

   The meta section was readable by anyone signed in, so a disabled
   account still saw the company name and revenue goal. Disabling an
   account should mean nothing at all comes back.
   ══════════════════════════════════════════════════════════════════ */

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active');
$$;

create or replace function public.can_read_section(p_section text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active() and case
    when p_section = 'meta' then true
    when p_section = 'comp' then public.perm('comm') in ('view','edit')
    else public.can_view(public.section_tab(p_section))
  end;
$$;

/* member_comp and payouts read their own row via my_member_id(), which
   already requires an active profile — restated here so the rule is
   visible at the policy rather than implied two calls away. */
drop policy if exists member_comp_select on public.member_comp;
create policy member_comp_select on public.member_comp for select to authenticated
  using (public.is_active()
         and (member_id = public.my_member_id() or public.perm('comm') in ('view','edit')));

drop policy if exists payouts_select on public.payouts;
create policy payouts_select on public.payouts for select to authenticated
  using (public.is_active()
         and (member_id = public.my_member_id() or public.perm('comm') in ('view','edit')));

grant execute on function public.is_active() to authenticated;
