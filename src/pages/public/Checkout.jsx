import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCart } from '@/context/CartContext.jsx'
import { useAuth } from '@/hooks/useAuth.js'
import { OrderAPI } from '@/services/api.js'
import { money } from '@/utils/format.js'
import { ShieldCheck, Lock } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2,'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7,'Enter a valid phone number'),
  address: z.string().min(5,'Enter your delivery address'),
  postcode: z.string().min(4,'Enter a valid postcode'),
  cardNumber: z.string().regex(/^[0-9 ]{12,19}$/,'Enter a 16-digit card number (test mode)'),
  cardExpiry: z.string().regex(/^\d{2}\/\d{2}$/,'MM/YY'),
  cardCvc: z.string().regex(/^\d{3,4}$/,'CVC'),
})

export default function Checkout(){
  const { lines, subtotal, clear } = useCart() || {}
  const { user } = useAuth() || {}
  const navigate = useNavigate()
  const [submitting,setSubmitting]=useState(false)
  const { register, handleSubmit, formState:{ errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name:user?.name||'', email:user?.email||'', phone:'', address:'', postcode:'', cardNumber:'', cardExpiry:'', cardCvc:'' },
  })

  if(!lines || lines.length===0) return <Navigate to="/cart" replace/>

  const onSubmit = async (data)=>{
    setSubmitting(true)
    const order = await OrderAPI.create({
      customerId: user?.id || 'guest',
      customerName: data.name,
      email: data.email,
      phone: data.phone,
      deliveryAddress: `${data.address}, ${data.postcode}`,
      items: lines.map(l=>({ productId:l.productId, name:l.product.name, price:l.product.price, quantity:l.quantity })),
      total: subtotal,
      // Ledger fields the admin reports aggregate on. A web checkout is a card payment with no
      // originating branch — reports surface these under "Web / unassigned" so the branch rows
      // and the overall total still reconcile.
      kind: 'retail',
      paymentMethod: 'online',
      branch: null,
    })
    await clear()
    setSubmitting(false)
    navigate(`/order-confirmation/${order.reference}`)
  }

  return (
    <div className="container-x py-12 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[12.5px] rounded-xl px-4 py-3 mt-4 flex items-center gap-2 max-w-2xl">
        <Lock size={14}/> Test / mock payment mode — no real card details are processed or stored. Connect a live Stripe key to enable real payments.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-[1fr_340px] gap-10 mt-8">
        <div className="space-y-6">
          <div className="surface p-6">
            <h2 className="font-bold text-[15px] mb-4">Contact & delivery</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" error={errors.name}><input {...register('name')} className="input-field"/></Field>
              <Field label="Email" error={errors.email}><input {...register('email')} className="input-field"/></Field>
              <Field label="Phone" error={errors.phone}><input {...register('phone')} className="input-field"/></Field>
              <Field label="Postcode" error={errors.postcode}><input {...register('postcode')} className="input-field"/></Field>
              <Field label="Address" error={errors.address} full><input {...register('address')} className="input-field"/></Field>
            </div>
          </div>
          <div className="surface p-6">
            <h2 className="font-bold text-[15px] mb-1 flex items-center gap-2"><ShieldCheck size={16} className="text-brand"/> Payment (test mode)</h2>
            <p className="text-[12px] text-graphite-400 mb-4">Use any values — e.g. 4242 4242 4242 4242, 12/34, 123.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Card number" error={errors.cardNumber} full><input {...register('cardNumber')} placeholder="4242 4242 4242 4242" className="input-field"/></Field>
              <Field label="Expiry" error={errors.cardExpiry}><input {...register('cardExpiry')} placeholder="MM/YY" className="input-field"/></Field>
              <Field label="CVC" error={errors.cardCvc}><input {...register('cardCvc')} placeholder="123" className="input-field"/></Field>
            </div>
          </div>
        </div>

        <div className="surface p-6 h-fit sticky top-24">
          <h2 className="font-bold text-[15px] mb-4">Order summary</h2>
          {lines.map(l=>(
            <div key={l.productId} className="flex justify-between text-[13px] text-graphite-600 mb-2">
              <span className="truncate pr-2">{l.product.name} × {l.quantity}</span><span className="mono-data flex-none">{money(l.product.price*l.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-[16px] pt-4 mt-2 border-t border-graphite-200"><span>Total</span><span className="mono-data">{money(subtotal)}</span></div>
          <button type="submit" disabled={submitting} className="btn btn-brand w-full mt-6 disabled:opacity-60">{submitting?'Placing order…':'Place order'}</button>
          <p className="text-[10.5px] text-graphite-400 mt-3 text-center">By ordering you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/warranty" className="underline">Warranty</Link> policy.</p>
        </div>
      </form>
    </div>
  )
}

function Field({ label, error, full, children }){
  return (
    <label className={`block ${full?'sm:col-span-2':''}`}>
      <span className="text-[12.5px] font-semibold text-graphite-600">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="text-[11.5px] text-red-500 mt-1 block">{error.message}</span>}
    </label>
  )
}
