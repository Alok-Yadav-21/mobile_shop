import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx'

// Reusable dialog for actions that must record a reason (cancellations, rejections).
export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel='Confirm', onConfirm, minLength=6 }){
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const valid = reason.trim().length >= minLength

  const submit = async ()=>{
    if(!valid) return
    setSubmitting(true)
    try{ await onConfirm(reason.trim()); setReason(''); onOpenChange(false) }
    finally{ setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <label className="block">
          <span className="text-[12.5px] font-semibold text-graphite-600">Reason (required)</span>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3}
            placeholder="Explain why — this is recorded on the record's timeline."
            className="input-field mt-1.5 h-auto py-2"/>
          {!valid && reason.length>0 && <span className="text-[11.5px] text-red-500 mt-1 block">At least {minLength} characters.</span>}
        </label>
        <DialogFooter>
          <button onClick={()=>onOpenChange(false)} className="btn btn-ghost">Back</button>
          <button onClick={submit} disabled={!valid||submitting} className="btn bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">
            {submitting?'Saving…':confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
