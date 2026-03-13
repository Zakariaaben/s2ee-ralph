import { makeAuth } from "@project/auth";
import { createFileRoute } from "@tanstack/react-router";

import { serverRuntime } from "@/server/runtime";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await serverRuntime.runPromise(makeAuth);
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        const auth = await serverRuntime.runPromise(makeAuth);
        return auth.handler(request);
      },
    },
  },
});
