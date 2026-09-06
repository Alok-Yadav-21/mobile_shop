// Who may change what on a repair.
//
// This lived inside the mock adapter, which is why the Supabase adapter had none of it — the
// two drifted because the rules were written where only one of them could reach them. They are
// pure decisions about an actor and a record here, so both adapters apply exactly the same
// ones, and they can be tested without a database.
//
// Postgres enforces the same rules again through RLS for the Supabase adapter. That is not
// duplication for its own sake: the adapter check gives a usable error message, the database
// check is the one that holds when the client is not ours.
import { requireCan, requireAssignedTechnician, isCustomer, AuthzError } from '@/lib/authz.js'
import { customerCanCancelRepair } from '@/lib/permissions.js'
import { QUOTE_SENT_STATUS } from '@/lib/quotes.js'

// A customer may withdraw their own booking before the device is taken in, and answer a quote
// once one has been put to them. Nothing else.
//
// Answering used to be neither: the guard admitted cancellations only, so Approve threw on
// every click, and Reject threw too because a repair at "Quote awaiting approval" is past the
// point where withdrawing is allowed. The one status that exists for the customer to act on
// could not be acted on.
export function assertCustomerMayPatch(repair, patch) {
  const keys = Object.keys(patch)
  const cancelShaped = patch.status === 'Cancelled'
    && keys.every((k) => ['status', 'cancellationReason'].includes(k))
  const answeringQuote = repair.status === QUOTE_SENT_STATUS

  const approving = answeringQuote && patch.status === 'Repair in progress' && keys.every((k) => k === 'status')
  const declining = answeringQuote && cancelShaped
  const withdrawing = cancelShaped && customerCanCancelRepair(repair)

  if (approving || declining || withdrawing) return
  if (cancelShaped) throw new Error('This repair can no longer be cancelled online — please call the branch.')
  throw new Error('You can only cancel your own booking, or answer a quote you have been sent.')
}

// Checked per field rather than once for the whole patch. A single blanket check was fine only
// while staff and admins had identical rights over a repair; the moment they did not, it
// demanded the progress capability of an admin patching nothing but `tech` — and blocked the
// one thing an admin is supposed to do.
export function assertStaffMayPatch(actor, repair, patch) {
  const { status, tech, cancellationReason, ...workshopFields } = patch

  if (status !== undefined && status !== repair.status) {
    if (status === 'Cancelled') {
      // Its own capability, so an admin can call a repair off without being able to walk one
      // through the workshop flow.
      requireCan(actor, 'cancelRepair')
    } else {
      requireCan(actor, 'updateRepairStatus')
      requireAssignedTechnician(actor, repair)
      assertQuoteIsSendable(repair, patch, status)
    }
  }

  // The quote, notes and everything else describing the work are the branch's record.
  if (Object.keys(workshopFields).length > 0) {
    requireCan(actor, 'updateRepairStatus')
    requireAssignedTechnician(actor, repair)
  }
  // `tech` is deliberately absent from both: assignment is guarded on its own.
}

// A quote with no figure on it is not a quote. Sending one put "Your approval needed" in front
// of the customer with nothing to approve, leaving them to accept an amount nobody had named.
export function assertQuoteIsSendable(repair, patch, status = patch.status) {
  if (status !== QUOTE_SENT_STATUS) return
  const amount = patch.quote !== undefined ? patch.quote : repair.quote
  if (amount == null || !(Number(amount) > 0)) {
    throw new Error('Enter the quote amount before sending it to the customer.')
  }
}

// The whole decision for one patch, so an adapter calls one function rather than reproducing
// the branch. Assignment is checked separately by the caller, because changing `tech` is an
// admin action rather than a repair action.
export function assertMayPatchRepair(actor, repair, patch) {
  if (isCustomer(actor)) return assertCustomerMayPatch(repair, patch)
  return assertStaffMayPatch(actor, repair, patch)
}

export function assertMayAssign(actor, repair, patch) {
  if (patch.tech === undefined || patch.tech === repair.tech) return
  requireCan(actor, 'assignTechnician')
}

export { AuthzError }
