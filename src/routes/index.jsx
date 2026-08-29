import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ROLES } from '@/constants/roles.js'
import { RoleBasedRoute } from './RoleBasedRoute.jsx'

import PublicLayout from '@/layouts/PublicLayout.jsx'
import Home from '@/pages/public/Home.jsx'

const CustomerLayout = lazy(()=>import('@/layouts/CustomerLayout.jsx'))
const StaffLayout = lazy(()=>import('@/layouts/StaffLayout.jsx'))
const AdminLayout = lazy(()=>import('@/layouts/AdminLayout.jsx'))

// public (code-split — only Home loads eagerly for fastest first paint)
const About = lazy(()=>import('@/pages/public/About.jsx'))
const Services = lazy(()=>import('@/pages/public/Services.jsx'))
const RepairServices = lazy(()=>import('@/pages/public/RepairServices.jsx'))
const BuySell = lazy(()=>import('@/pages/public/BuySell.jsx'))
const Refurbished = lazy(()=>import('@/pages/public/Refurbished.jsx'))
const Branches = lazy(()=>import('@/pages/public/Branches.jsx'))
const Products = lazy(()=>import('@/pages/public/Products.jsx'))
const ProductDetails = lazy(()=>import('@/pages/public/ProductDetails.jsx'))
const Cart = lazy(()=>import('@/pages/public/Cart.jsx'))
const Checkout = lazy(()=>import('@/pages/public/Checkout.jsx'))
const OrderConfirmation = lazy(()=>import('@/pages/public/OrderConfirmation.jsx'))
const Contact = lazy(()=>import('@/pages/public/Contact.jsx'))
const Warranty = lazy(()=>import('@/pages/public/Warranty.jsx'))
const Terms = lazy(()=>import('@/pages/public/Terms.jsx'))
const Privacy = lazy(()=>import('@/pages/public/Privacy.jsx'))
const NotFound = lazy(()=>import('@/pages/public/NotFound.jsx'))
const Login = lazy(()=>import('@/pages/auth/Login.jsx'))
const Register = lazy(()=>import('@/pages/auth/Register.jsx'))
// design lab — isolated, unlisted preview routes (not part of production nav or IA)
const PrecisionLab = lazy(()=>import('@/pages/design-lab/Precision.jsx'))
const CircuitLab = lazy(()=>import('@/pages/design-lab/Circuit.jsx'))
const LuxeLab = lazy(()=>import('@/pages/design-lab/Luxe.jsx'))
// customer
const CxDashboard = lazy(()=>import('@/pages/customer/Dashboard.jsx'))
const BookRepair = lazy(()=>import('@/pages/customer/BookRepair.jsx'))
const MyRepairs = lazy(()=>import('@/pages/customer/MyRepairs.jsx'))
const RepairTracking = lazy(()=>import('@/pages/customer/RepairTracking.jsx'))
const MyOrders = lazy(()=>import('@/pages/customer/MyOrders.jsx'))
const SellDevice = lazy(()=>import('@/pages/customer/SellDevice.jsx'))
const Profile = lazy(()=>import('@/pages/customer/Profile.jsx'))
// staff
const StDashboard = lazy(()=>import('@/pages/staff/Dashboard.jsx'))
const AssignedRepairs = lazy(()=>import('@/pages/staff/AssignedRepairs.jsx'))
const RepairDetails = lazy(()=>import('@/pages/staff/RepairDetails.jsx'))
const CustomerRequests = lazy(()=>import('@/pages/staff/CustomerRequests.jsx'))
const StockTasks = lazy(()=>import('@/pages/staff/StockTasks.jsx'))
const MyShifts = lazy(()=>import('@/pages/staff/MyShifts.jsx'))
// admin
const AdDashboard = lazy(()=>import('@/pages/admin/Dashboard.jsx'))
const ManageUsers = lazy(()=>import('@/pages/admin/ManageUsers.jsx'))
const ManageStaff = lazy(()=>import('@/pages/admin/ManageStaff.jsx'))
const ManageCustomers = lazy(()=>import('@/pages/admin/ManageCustomers.jsx'))
const ManageRepairs = lazy(()=>import('@/pages/admin/ManageRepairs.jsx'))
const AssignRepairs = lazy(()=>import('@/pages/admin/AssignRepairs.jsx'))
const ManageProducts = lazy(()=>import('@/pages/admin/ManageProducts.jsx'))
const ManageCategories = lazy(()=>import('@/pages/admin/ManageCategories.jsx'))
const ManageServices = lazy(()=>import('@/pages/admin/ManageServices.jsx'))
const ManageOrders = lazy(()=>import('@/pages/admin/ManageOrders.jsx'))
const BuySellRequests = lazy(()=>import('@/pages/admin/BuySellRequests.jsx'))
const Payments = lazy(()=>import('@/pages/admin/Payments.jsx'))
const Reports = lazy(()=>import('@/pages/admin/Reports.jsx'))
const Wages = lazy(()=>import('@/pages/admin/Wages.jsx'))
const ShiftApprovals = lazy(()=>import('@/pages/admin/ShiftApprovals.jsx'))
const Settings = lazy(()=>import('@/pages/admin/Settings.jsx'))
const AdminBranches = lazy(()=>import('@/pages/admin/Branches.jsx'))
const AuditLog = lazy(()=>import('@/pages/admin/AuditLog.jsx'))

function RouteFallback(){
  return <div className="min-h-[40vh] grid place-items-center text-graphite-400 text-sm">Loading…</div>
}

export default function AppRoutes(){
  return (
    <Suspense fallback={<RouteFallback/>}>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout/>}>
          <Route path="/" element={<Home/>}/>
          <Route path="/about" element={<About/>}/>
          <Route path="/services" element={<Services/>}/>
          <Route path="/repair-services" element={<RepairServices/>}/>
          <Route path="/buy-sell" element={<BuySell/>}/>
          <Route path="/refurbished" element={<Refurbished/>}/>
          <Route path="/branches" element={<Branches/>}/>
          <Route path="/products" element={<Products/>}/>
          <Route path="/products/:id" element={<ProductDetails/>}/>
          <Route path="/cart" element={<Cart/>}/>
          <Route path="/checkout" element={<Checkout/>}/>
          <Route path="/order-confirmation/:ref" element={<OrderConfirmation/>}/>
          <Route path="/contact" element={<Contact/>}/>
          <Route path="/warranty" element={<Warranty/>}/>
          <Route path="/terms" element={<Terms/>}/>
          <Route path="/privacy" element={<Privacy/>}/>
          <Route path="*" element={<NotFound/>}/>
        </Route>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>

        {/* Design lab — unlisted preview routes, standalone (no PublicLayout chrome), not linked from any nav */}
        <Route path="/design-lab/precision" element={<PrecisionLab/>}/>
        <Route path="/design-lab/circuit" element={<CircuitLab/>}/>
        <Route path="/design-lab/luxe" element={<LuxeLab/>}/>

        {/* Customer */}
        <Route path="/app" element={<RoleBasedRoute allow={[ROLES.CUSTOMER]}><CustomerLayout/></RoleBasedRoute>}>
          <Route index element={<CxDashboard/>}/>
          <Route path="book" element={<BookRepair/>}/>
          <Route path="repairs" element={<MyRepairs/>}/>
          <Route path="repairs/:ref" element={<RepairTracking/>}/>
          <Route path="sell" element={<SellDevice/>}/>
          <Route path="orders" element={<MyOrders/>}/>
          <Route path="profile" element={<Profile/>}/>
        </Route>

        {/* Staff */}
        <Route path="/staff" element={<RoleBasedRoute allow={[ROLES.STAFF, ROLES.ADMIN]}><StaffLayout/></RoleBasedRoute>}>
          <Route index element={<StDashboard/>}/>
          <Route path="repairs" element={<AssignedRepairs/>}/>
          <Route path="repairs/:ref" element={<RepairDetails/>}/>
          <Route path="requests" element={<CustomerRequests/>}/>
          <Route path="stock" element={<StockTasks/>}/>
          <Route path="shifts" element={<MyShifts/>}/>
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<RoleBasedRoute allow={[ROLES.ADMIN]}><AdminLayout/></RoleBasedRoute>}>
          <Route index element={<AdDashboard/>}/>
          <Route path="repairs" element={<ManageRepairs/>}/>
          <Route path="assign" element={<AssignRepairs/>}/>
          <Route path="buysell" element={<BuySellRequests/>}/>
          <Route path="products" element={<ManageProducts/>}/>
          <Route path="categories" element={<ManageCategories/>}/>
          <Route path="services" element={<ManageServices/>}/>
          <Route path="orders" element={<ManageOrders/>}/>
          <Route path="payments" element={<Payments/>}/>
          <Route path="customers" element={<ManageCustomers/>}/>
          <Route path="staff" element={<ManageStaff/>}/>
          <Route path="users" element={<ManageUsers/>}/>
          <Route path="branches" element={<AdminBranches/>}/>
          <Route path="reports" element={<Reports/>}/>
          <Route path="wages" element={<Wages/>}/>
          <Route path="timesheets" element={<ShiftApprovals/>}/>
          <Route path="audit" element={<AuditLog/>}/>
          <Route path="settings" element={<Settings/>}/>
        </Route>
      </Routes>
    </Suspense>
  )
}
