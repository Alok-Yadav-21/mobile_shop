import { useState, useEffect, useCallback } from 'react'
import { subscribe } from '@/services/liveStore.js'

// Fetches on mount, and again whenever the data underneath changes — including a change made
// in another tab. Every screen in the app reads through this hook, so a status update by staff
// reaches the customer's open page and the admin's list without any of them polling or being
// told which records they depend on.
export function useAsync(fn, deps=[], { live=true }={}){
  const [data,setData]=useState(); const [loading,setLoading]=useState(true); const [error,setError]=useState(null)
  const run=useCallback((quiet=false)=>{
    // A live refresh must not blank the screen: the page already has data, and flipping back to
    // the loading state on every background update makes it flicker.
    if(!quiet) setLoading(true)
    setError(null)
    return Promise.resolve().then(fn)
      .then(d=>{ setData(d); setLoading(false) })
      .catch(e=>{ setError(e); setLoading(false) })
  },deps)
  useEffect(()=>{ run() },[run])
  useEffect(()=>{ if(!live) return undefined; return subscribe(()=>run(true)) },[run,live])
  return { data, loading, error, refetch:run }
}
