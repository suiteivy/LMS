-- CLOUDORA LMS ONLY. Do not run this migration on another product database.
-- LMS summaries for the dedicated CRM read endpoint. The backend calls these
-- with its service credential after authenticating the CRM read key.
create index if not exists crm_snapshot_tickets_open_idx on public.support_tickets (institution_id)
  where status in ('pending', 'open', 'in_progress', 'escalated');
create index if not exists crm_snapshot_subscription_tx_idx
  on public.financial_transactions (institution_id, date desc, created_at desc)
  where direction = 'inflow' and status = 'completed';
create index if not exists crm_snapshot_main_admin_idx on public.admins (institution_id)
  where is_main = true;

create or replace function public.crm_lms_overview() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'customer_count', (select count(*) from public.institutions),
    'active_customer_count', (select count(*) from public.institutions where subscription_status = 'active'),
    'open_tickets', (select count(*) from public.support_tickets
      where status in ('pending', 'open', 'in_progress', 'escalated')),
    'subscription_revenue', coalesce((
      select jsonb_agg(jsonb_build_object('amount', amount, 'currency', code) order by code)
      from (
        select c.code, sum(t.amount) as amount
        from public.financial_transactions t
        join public.institutions i on i.id = t.institution_id
        join public.currencies c on c.id = i.currency_id
        where t.direction = 'inflow' and t.status = 'completed'
          and (lower(t.type) = 'subscription' or
            (lower(t.type) = 'other' and (lower(t.meta->>'legacy_type') = 'subscription'
              or lower(t.meta->>'subscription_entry') = 'true')))
        group by c.code
      ) revenue
    ), '[]'::jsonb)
  );
$$;

create or replace function public.crm_lms_accounts_page(after_id uuid default null, page_size integer default 50)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with page as (
    select i.id, i.name, i.location, i.subscription_plan, i.subscription_status,
      i.subscription_cycle, i.updated_at, i.created_at, c.code as currency
    from public.institutions i join public.currencies c on c.id = i.currency_id
    where after_id is null or i.id > after_id
    order by i.id limit least(greatest(page_size, 1), 100) + 1
  ), visible as (
    select * from page order by id limit least(greatest(page_size, 1), 100)
  ), rows as (
    select v.id, jsonb_build_object(
      'external_id', v.id::text, 'name', v.name, 'location', v.location,
      'admin_name', main_admin.name,
      'subscription', jsonb_build_object('plan', v.subscription_plan,
        'status', v.subscription_status, 'cycle', v.subscription_cycle),
      'last_payment', last_payment.payment,
      'open_tickets', (select count(*) from public.support_tickets st
        where st.institution_id = v.id and st.status in ('pending', 'open', 'in_progress', 'escalated')),
      'updated_at', coalesce(v.updated_at, v.created_at)
    ) as account
    from visible v
    left join lateral (
      select nullif(trim(concat_ws(' ', u.first_name, u.last_name)), '') as name
      from public.admins a join public.users u on u.id = a.user_id
      where a.institution_id = v.id and a.is_main = true
      order by a.created_at desc nulls last limit 1
    ) main_admin on true
    left join lateral (
      select jsonb_build_object('amount', t.amount, 'currency', v.currency,
        'status', t.status, 'paid_at', coalesce(t.date::text, t.created_at::text),
        'reference', t.reference_id) as payment
      from public.financial_transactions t
      where t.institution_id = v.id and t.direction = 'inflow' and t.status = 'completed'
        and (lower(t.type) = 'subscription' or
          (lower(t.type) = 'other' and (lower(t.meta->>'legacy_type') = 'subscription'
            or lower(t.meta->>'subscription_entry') = 'true')))
      order by t.date desc nulls last, t.created_at desc nulls last limit 1
    ) last_payment on true
  )
  select jsonb_build_object(
    'accounts', coalesce((select jsonb_agg(account order by id) from rows), '[]'::jsonb),
    'next_cursor', case when (select count(*) from page) > least(greatest(page_size, 1), 100)
      then (select id::text from visible order by id desc limit 1) else null end
  );
$$;

-- One RPC call gives overview and page data from the same SQL statement.
create or replace function public.crm_lms_snapshot(after_id uuid default null, page_size integer default 50)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'summary', public.crm_lms_overview(),
    'page', public.crm_lms_accounts_page(after_id, page_size)
  );
$$;

revoke all on function public.crm_lms_overview() from public, anon, authenticated;
revoke all on function public.crm_lms_accounts_page(uuid, integer) from public, anon, authenticated;
revoke all on function public.crm_lms_snapshot(uuid, integer) from public, anon, authenticated;
grant execute on function public.crm_lms_overview() to service_role;
grant execute on function public.crm_lms_accounts_page(uuid, integer) to service_role;
grant execute on function public.crm_lms_snapshot(uuid, integer) to service_role;

-- Make newly created RPC signatures visible to the Supabase Data API.
notify pgrst, 'reload schema';
