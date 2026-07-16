import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state = { error: null } }
  static getDerivedStateFromError(error){ return { error } }
  componentDidCatch(error, info){ console.error('Unhandled UI error:', error, info) }
  render(){
    if(!this.state.error) return this.props.children
    return (
      <div className="min-h-screen grid place-items-center bg-paper px-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 grid place-items-center mx-auto mb-4"><AlertTriangle size={22}/></div>
          <h1 className="text-xl font-extrabold tracking-tight">Something went wrong</h1>
          <p className="text-graphite-400 text-[14px] mt-2">An unexpected error occurred. Try reloading the page.</p>
          <button onClick={()=>window.location.assign('/')} className="btn btn-brand mt-6">Back to home</button>
        </div>
      </div>
    )
  }
}
