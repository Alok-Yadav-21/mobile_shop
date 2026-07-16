import { useState, useEffect, useCallback } from 'react'
export function useAsync(fn, deps=[]){
  const [data,setData]=useState(); const [loading,setLoading]=useState(true); const [error,setError]=useState(null)
  const run=useCallback(()=>{
    setLoading(true); setError(null)
    return Promise.resolve().then(fn)
      .then(d=>{ setData(d); setLoading(false) })
      .catch(e=>{ setError(e); setLoading(false) })
  },deps)
  useEffect(()=>{ run() },[run])
  return { data, loading, error, refetch:run }
}
