import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { RegistryProvider } from "@effect/atom-react";

import "./index.css";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    context: {},
    defaultPendingComponent: () => <div />,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    Wrap: ({ children }) => <RegistryProvider>{children}</RegistryProvider>,
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
