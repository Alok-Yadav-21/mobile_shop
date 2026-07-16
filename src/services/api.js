// Backward-compatible re-export: pages import RepairAPI/ProductAPI/BranchAPI/UserAPI/etc.
// from '@/services/api.js'. The real implementation lives behind the swappable adapter in
// src/services/adapter — see that folder to add real Supabase wiring or extend the mock data.
export {
  RepairAPI, ProductAPI, CategoryAPI, ServiceAPI, BranchAPI, CartAPI, OrderAPI, TradeInAPI,
  UserAPI, NotificationAPI, AuditAPI, SettingsAPI, AddressAPI, WarrantyAPI, TECHS, isMockBackend,
} from './adapter/index.js'
