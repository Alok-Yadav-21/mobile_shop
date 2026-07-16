-- RLS for the tables/columns added in 0003_role_crud.sql.
-- Run after 0003_role_crud.sql. Reuses the helper functions defined in 0002_policies.sql
-- (current_profile_role, current_profile_branch, is_staff_or_admin, is_admin).

-- ── repair_parts: same visibility as the parent repair; staff/admin write ──────
alter table repair_parts enable row level security;
create policy "repair_parts: visible with repair" on repair_parts for select
  using (exists (
    select 1 from repairs r where r.id = repair_id
      and (r.customer_id = auth.uid()
        or (current_profile_role() = 'staff' and r.branch_id = current_profile_branch())
        or is_admin())
  ));
create policy "repair_parts: staff/admin write" on repair_parts for insert with check (is_staff_or_admin());
create policy "repair_parts: staff/admin update" on repair_parts for update using (is_staff_or_admin());
create policy "repair_parts: admin delete" on repair_parts for delete using (is_admin());

-- ── inventory_movements: staff/admin only ───────────────────────────────────────
alter table inventory_movements enable row level security;
create policy "inventory_movements: staff/admin read" on inventory_movements for select using (is_staff_or_admin());
create policy "inventory_movements: staff/admin insert" on inventory_movements for insert with check (is_staff_or_admin());

-- ── customer_notes: staff/admin only, never visible to the customer ────────────
alter table customer_notes enable row level security;
create policy "customer_notes: staff/admin read" on customer_notes for select using (is_staff_or_admin());
create policy "customer_notes: staff/admin insert" on customer_notes for insert with check (is_staff_or_admin());

-- ── audit_logs: admin read-only; any authenticated staff/admin action may write one ──
alter table audit_logs enable row level security;
create policy "audit_logs: admin read" on audit_logs for select using (is_admin());
create policy "audit_logs: staff/admin insert" on audit_logs for insert with check (is_staff_or_admin());

-- ── trade-in inspector notes: internal_notes/rejection_reason follow the existing
-- trade_in_requests policies (staff/admin update) — no new policy needed, only
-- documenting that customer-facing reads must exclude internal_notes at the query
-- layer (the mock/Supabase adapters never select internal_notes for customer views).
