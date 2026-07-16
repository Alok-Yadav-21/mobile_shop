import { Link } from 'react-router-dom'
import { Search, ArrowLeft } from 'lucide-react'

export default function NotFound(){
  return (
    <div className="container-x py-24 sm:py-32 text-center">
      <span className="text-[13px] font-bold uppercase tracking-[.14em] text-brand mono-data">404</span>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">We couldn't find that page</h1>
      <p className="text-graphite-500 mt-3 max-w-md mx-auto">The page you're looking for may have moved, or the link might be out of date.</p>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Link to="/" className="btn btn-brand"><ArrowLeft size={16}/> Back home</Link>
        <Link to="/products" className="btn btn-ghost"><Search size={16}/> Browse products</Link>
      </div>
    </div>
  )
}
