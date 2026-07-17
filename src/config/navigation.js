// Single source of truth for the app's mobile chrome:
// app-bar titles, the drawer's full nav list, the bottom tab bar,
// and the "More" bottom sheet. Mirrors PAGE_META / NAV_ITEMS from
// the design prototype so every piece of chrome stays in sync.

export const PAGE_META = {
  '/dashboard':    { title: 'Dashboard',       eyebrow: 'Overview' },
  '/users':        { title: 'User Management', eyebrow: 'People' },
  '/map':          { title: 'Hub Map',         eyebrow: 'Live view' },
  '/orders':       { title: 'Orders',          eyebrow: 'Fulfilment' },
  '/products':     { title: 'Products',        eyebrow: 'Catalog' },
  '/transactions': { title: 'Transactions',    eyebrow: 'Money flow' },
  '/reports':      { title: 'Reports',         eyebrow: 'Analytics' },
  '/settings':     { title: 'Settings',        eyebrow: 'Configuration' },
  '/tickets':      { title: 'Support Tickets', eyebrow: 'Help desk' },
  '/banners':      { title: 'Banners',         eyebrow: 'Promotions' },
};

export const getPageMeta = (path) =>
  PAGE_META[path] || { title: 'Groxo Admin', eyebrow: 'Overview' };

// Full nav list shown in the side drawer.
export const NAV_ITEMS = [
  { path: '/dashboard',    icon: '📊', label: 'Dashboard' },
  { path: '/orders',       icon: '📦', label: 'Orders' },
  { path: '/products',     icon: '🛍️', label: 'Products' },
  { path: '/users',        icon: '👥', label: 'User Management' },
  { path: '/map',          icon: '📍', label: 'Hub Map' },
  { path: '/transactions', icon: '💰', label: 'Transactions' },
  { path: '/reports',      icon: '📈', label: 'Reports' },
  { path: '/banners',      icon: '📢', label: 'Banners' },
  { path: '/tickets',      icon: '🎫', label: 'Support Tickets' },
  { path: '/settings',     icon: '⚙️', label: 'Settings' },
];

// Routes that live directly on the bottom tab bar.
export const TAB_ROUTES = ['/dashboard', '/orders', '/products', '/users'];

// Everything else surfaces through the "More" bottom sheet.
export const MORE_ITEMS = [
  { path: '/map',          icon: '📍', label: 'Hub Map' },
  { path: '/transactions', icon: '💰', label: 'Transactions' },
  { path: '/reports',      icon: '📈', label: 'Reports' },
  { path: '/banners',      icon: '📢', label: 'Banners' },
  { path: '/tickets',      icon: '🎫', label: 'Support Tickets' },
  { path: '/settings',     icon: '⚙️', label: 'Settings' },
];

export const SECONDARY_ROUTES = MORE_ITEMS.map((i) => i.path);
