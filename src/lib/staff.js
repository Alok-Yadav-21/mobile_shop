// Resolving the technician a repair is assigned to.
//
// `repair.tech` holds a staff account id. It used to hold a name, and three parts of the app
// disagreed about which name: the seed repairs and the TECHS list used first names ('Priya'),
// deletionRules.js compared against the full account name ('Priya Shah') — so its "this
// technician still has active repairs" guard never once matched — and the Supabase adapter
// mapped the same field to a technician_id column. An id is the only one of the three that can
// identify a person, survive a rename, and be told they have been assigned something.
//
// Names are resolved for display at the point of rendering, from the staff list the page has
// already loaded.

export function technicianName(users, techId, fallback = '—') {
  if (!techId) return fallback
  const u = (users || []).find((x) => x.id === techId)
  // An id with no matching account is shown as-is rather than as "—": it means the account was
  // removed, and hiding that makes the repair look unassigned when it is not.
  return u?.name || techId
}

// Who may be assigned a repair at a given branch. A technician works at one branch, so the
// assignment list is scoped to it — offering the whole network invites assigning somebody who
// cannot pick the device up.
export function techniciansForBranch(users, branchId) {
  return (users || []).filter((u) => u.role === 'staff'
    && !u.archived && (u.status ?? 'active') === 'active'
    && (!branchId || u.branch === branchId))
}

export const isAssignedTo = (repair, staffId) => !!staffId && repair?.tech === staffId
