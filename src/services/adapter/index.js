// Single switch point between the local mock adapter and the Supabase-backed one.
// Page code should never import mock.js or supabase.js directly — always go through here
// (or through src/services/api.js, which re-exports this for backward compatibility).
import { isMockBackend } from '@/lib/supabaseClient.js'
import * as MockAdapter from './mock.js'
import * as SupabaseAdapter from './supabase.js'

const Adapter = isMockBackend ? MockAdapter : SupabaseAdapter

export const RepairAPI = Adapter.RepairAPI
export const ProductAPI = Adapter.ProductAPI
export const CategoryAPI = Adapter.CategoryAPI
export const ServiceAPI = Adapter.ServiceAPI
export const BranchAPI = Adapter.BranchAPI
export const CartAPI = Adapter.CartAPI
export const OrderAPI = Adapter.OrderAPI
export const TradeInAPI = Adapter.TradeInAPI
export const UserAPI = Adapter.UserAPI
export const NotificationAPI = Adapter.NotificationAPI
export const AuditAPI = Adapter.AuditAPI
export const SettingsAPI = Adapter.SettingsAPI
export const AddressAPI = Adapter.AddressAPI
export const WarrantyAPI = Adapter.WarrantyAPI
export const TECHS = Adapter.TECHS
export { isMockBackend }
