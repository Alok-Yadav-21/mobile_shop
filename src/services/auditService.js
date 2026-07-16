import { AuditAPI } from '@/services/api.js'

// Thin convenience wrapper over AuditAPI so call sites don't repeat the actor shape.
// Fire-and-forget by design: an audit-log failure must never block the underlying
// action it's describing (the action has already succeeded by the time this runs).
export function logAction({ user, action, entityType, entityId, before, after, reason }){
  AuditAPI.log({
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    action, entityType, entityId,
    before: before ?? null, after: after ?? null, reason: reason ?? null,
  }).catch(()=>{})
}
