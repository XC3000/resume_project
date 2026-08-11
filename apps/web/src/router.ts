import React from 'react';
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingView } from './views/LandingView';
import { SignInView } from './views/SignInView';
import { SignUpView } from './views/SignUpView';
import { DashboardView } from './views/DashboardView';
import { CacheTestView } from './views/CacheTestView';
import { UsersView } from './views/UsersView';

const rootRoute = createRootRoute({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingView,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signin',
  component: SignInView,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignUpView,
});

// Protected Dashboard route: requires active session, redirects unauthenticated users to /signin
const ProtectedDashboard: React.FC = () =>
  React.createElement(ProtectedRoute, null, React.createElement(DashboardView));

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: ProtectedDashboard,
});

const cacheRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cache',
  component: CacheTestView,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UsersView,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  signUpRoute,
  dashboardRoute,
  cacheRoute,
  usersRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
