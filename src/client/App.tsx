import { createRouter, createRoute, createRootRoute, Outlet, Link } from '@tanstack/react-router';
import { RosterPage } from './pages/Roster';
import { MetaTeamsPage } from './pages/MetaTeams';
import { TeamMatchPage } from './pages/TeamMatch';

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg text-white">Champions Helper</span>
        <Link
          to="/roster"
          className="text-gray-400 hover:text-white transition-colors"
          activeProps={{ className: 'text-white font-medium' }}
        >
          Roster
        </Link>
        <Link
          to="/meta-teams"
          className="text-gray-400 hover:text-white transition-colors"
          activeProps={{ className: 'text-white font-medium' }}
        >
          Meta Teams
        </Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    window.location.replace('/roster');
    return null;
  },
});

const rosterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roster',
  component: RosterPage,
});

const metaTeamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/meta-teams',
  component: MetaTeamsPage,
});

const teamMatchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/$teamId',
  component: TeamMatchPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  rosterRoute,
  metaTeamsRoute,
  teamMatchRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
