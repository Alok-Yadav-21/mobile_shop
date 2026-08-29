// Central route path registry. Every Link/NavLink/useNavigate/redirect in the app should
// import paths from here rather than hardcoding strings, so the route tree in
// src/routes/index.jsx and every page that links to it stay in sync by construction.

export const PATHS = {
  home: '/',
  about: '/about',
  services: '/services',
  repairServices: '/repair-services',
  buySell: '/buy-sell',
  tradeIn: '/trade-in',
  products: '/products',
  product: (id = ':id') => `/products/${id}`,
  refurbished: '/refurbished',
  branches: '/branches',
  contact: '/contact',
  cart: '/cart',
  checkout: '/checkout',
  orderConfirmation: (ref = ':ref') => `/order-confirmation/${ref}`,
  warranty: '/warranty',
  terms: '/terms',
  privacy: '/privacy',

  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',

  customer: {
    root: '/app',
    book: '/app/book',
    repairs: '/app/repairs',
    repair: (ref = ':ref') => `/app/repairs/${ref}`,
    sell: '/app/sell',
    orders: '/app/orders',
    order: (ref = ':ref') => `/app/orders/${ref}`,
    addresses: '/app/addresses',
    warranties: '/app/warranties',
    notifications: '/app/notifications',
    profile: '/app/profile',
    support: '/app/support',
  },

  staff: {
    root: '/staff',
    repairs: '/staff/repairs',
    shifts: '/staff/shifts',
    repair: (ref = ':ref') => `/staff/repairs/${ref}`,
    requests: '/staff/requests',
    stock: '/staff/stock',
    profile: '/staff/profile',
  },

  admin: {
    root: '/admin',
    repairs: '/admin/repairs',
    assign: '/admin/assign',
    buysell: '/admin/buysell',
    products: '/admin/products',
    inventory: '/admin/inventory',
    categories: '/admin/categories',
    orders: '/admin/orders',
    payments: '/admin/payments',
    customers: '/admin/customers',
    staff: '/admin/staff',
    branches: '/admin/branches',
    services: '/admin/services',
    warranties: '/admin/warranties',
    users: '/admin/users',
    reports: '/admin/reports',
    wages: '/admin/wages',
    shiftApprovals: '/admin/timesheets',
    settings: '/admin/settings',
  },

  // Isolated, unlisted design previews — never linked from production nav
  designLab: {
    precision: '/design-lab/precision',
    circuit: '/design-lab/circuit',
    luxe: '/design-lab/luxe',
  },
}
