/* ═══════════════════════════════════════════════════════════════════
   Narrow the 'own' level on Comp & Bonuses.

   can_view() treats 'own' as readable, which meant a member set to
   'own' received the whole comp section — every commission plan,
   override plan and bonus pool in the company. 'own' is supposed to
   mean their own record and nothing else.

   The comp section now requires 'view' or 'edit'. Members on 'own'
   read their own figures through my_comp() instead, which returns
   only the plans actually assigned to them.
   ══════════════════════════════════════════════════════════════════ */

create or replace function public.can_read_section(p_section text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_section = 'meta' then true
    when p_section = 'comp' then public.perm('comm') in ('view','edit')
    else public.can_view(public.section_tab(p_section))
  end;
$$;

drop policy if exists sections_select on public.dashboard_sections;
create policy sections_select on public.dashboard_sections for select to authenticated
  using (public.can_read_section(section));

/* Everything an 'own' member legitimately needs to see their own tier:
   the plans assigned to them, and nothing belonging to anyone else. */
create or replace function public.my_comp()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_member_id text := public.my_member_id();
  v_comp record;
  v_section jsonb;
begin
  if v_member_id is null then return null; end if;

  select * into v_comp from public.member_comp
   where org_id = 'model-luxe' and member_id = v_member_id;

  if not found then return null; end if;

  select data into v_section from public.dashboard_sections
   where org_id = 'model-luxe' and section = 'comp';

  return jsonb_build_object(
    'memberId', v_member_id,
    'compType', v_comp.comp_type,
    'eligibility', v_comp.eligibility,
    'effectiveDate', v_comp.effective_date,
    'commissionPlan', (
      select plan from jsonb_array_elements(coalesce(v_section->'commissionPlans','[]'::jsonb)) plan
       where plan->>'id' = v_comp.commission_plan_id limit 1),
    'overridePlan', (
      select plan from jsonb_array_elements(coalesce(v_section->'overridePlans','[]'::jsonb)) plan
       where plan->>'id' = v_comp.override_plan_id limit 1),
    'fallbackCommission', case
      when coalesce(v_comp.commission_plan_id,'') = '' then v_section->'commission' else null end
  );
end;
$$;

grant execute on function public.my_comp() to authenticated;
