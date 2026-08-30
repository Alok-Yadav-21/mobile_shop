import { LayoutDashboard, Wrench, ClipboardList, PackageSearch, ShoppingBag, Users,
  UserCog, Tags, CreditCard, BarChart3, Settings, Boxes, ArrowLeftRight, ListChecks,
  Calendar, User, Package, MapPin, ShieldCheck, History, Wallet, CalendarClock } from 'lucide-react'

export const PUBLIC_NAV = [
  { label:'Home', to:'/' },
  { label:'Services', to:'/services' },
  { label:'Repair prices', to:'/repair-services' },
  { label:'Shop', to:'/products' },
  { label:'Sell your device', to:'/buy-sell' },
  { label:'About', to:'/about' },
  { label:'Contact', to:'/contact' },
]

export const CUSTOMER_NAV = [
  { label:'Dashboard', to:'/app', icon:LayoutDashboard, end:true },
  { label:'Book a repair', to:'/app/book', icon:Wrench },
  { label:'My repairs', to:'/app/repairs', icon:ClipboardList },
  { label:'Sell my device', to:'/app/sell', icon:ArrowLeftRight },
  { label:'My orders', to:'/app/orders', icon:ShoppingBag },
  { label:'Profile', to:'/app/profile', icon:User },
]

export const STAFF_NAV = [
  { label:'Dashboard', to:'/staff', icon:LayoutDashboard, end:true },
  { label:'Assigned repairs', to:'/staff/repairs', icon:Wrench },
  { label:'Customer requests', to:'/staff/requests', icon:ClipboardList },
  { label:'Stock tasks', to:'/staff/stock', icon:Boxes },
  { label:'My hours & pay', to:'/staff/shifts', icon:CalendarClock },
]

export const ADMIN_NAV = [
  { label:'Dashboard', to:'/admin', icon:LayoutDashboard, end:true },
  { label:'Repairs', to:'/admin/repairs', icon:Wrench },
  { label:'Assign repairs', to:'/admin/assign', icon:ListChecks },
  { label:'Buy / sell requests', to:'/admin/buysell', icon:ArrowLeftRight },
  { label:'Products', to:'/admin/products', icon:Package },
  { label:'Categories', to:'/admin/categories', icon:Tags },
  { label:'Repair services', to:'/admin/services', icon:PackageSearch },
  { label:'Orders', to:'/admin/orders', icon:ShoppingBag },
  { label:'Payments', to:'/admin/payments', icon:CreditCard },
  { label:'Customers', to:'/admin/customers', icon:Users },
  { label:'Staff', to:'/admin/staff', icon:UserCog },
  { label:'Timesheets', to:'/admin/timesheets', icon:CalendarClock },
  { label:'Wages', to:'/admin/wages', icon:Wallet },
  { label:'Users', to:'/admin/users', icon:ShieldCheck },
  { label:'Branches', to:'/admin/branches', icon:MapPin },
  { label:'Reports', to:'/admin/reports', icon:BarChart3 },
  { label:'Audit log', to:'/admin/audit', icon:History },
  { label:'Settings', to:'/admin/settings', icon:Settings },
]
