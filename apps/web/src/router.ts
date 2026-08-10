import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppLayout } from './components/AppLayout';
import { DashboardView } from './views/DashboardView';
import { CacheTestView } from './views/CacheTestView';
import { UsersView } from './views/UsersView';

const rootRoute = createRootRoute({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardView,
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

const routeTree = rootRoute.addChildren([indexRoute, cacheRoute, usersRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
