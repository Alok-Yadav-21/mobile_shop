-- Adds an "archived" lifecycle state alongside the existing active/inactive flags for every
-- entity managed from the admin CRUD pages (products, categories, branches, services,
-- accounts) plus staff job-title/specialisation fields. Run after 0005_super_admin.sql.
--
-- archived is intentionally a separate flag from active/status rather than replacing it:
-- - active=false, archived=false  -> "Inactive" (temporarily hidden, easy to reactivate)
-- - archived=true                 -> "Archived" (retired; excluded from normal lists, still
--                                     referenced by historical orders/repairs/audit entries)

alter table products add column if not exists archived boolean not null default false;
alter table categories add column if not exists archived boolean not null default false;
alter table branches add column if not exists archived boolean not null default false;
alter table services add column if not exists archived boolean not null default false;
alter table profiles add column if not exists archived boolean not null default false;

-- Staff-specific fields used by the Staff management page.
alter table profiles add column if not exists job_title text;
alter table profiles add column if not exists specialisations text[];

-- Track who made a stock adjustment / part addition, so staff deletion can be blocked when
-- there's real inventory/repair activity attributed to them.
alter table inventory_movements add column if not exists actor_id uuid references profiles(id);
alter table repair_parts add column if not exists added_by uuid references profiles(id);

-- Product detail fields used by the admin Products page (brand/description already existed).
alter table products add column if not exists specs jsonb;
alter table products add column if not exists warranty_months int;
