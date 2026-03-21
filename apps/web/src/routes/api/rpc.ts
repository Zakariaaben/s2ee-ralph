import { createFileRoute } from "@tanstack/react-router";
import { ServiceMap } from "effect";

import { rpcHandler } from "@/server/rpc/handler";

export const Route = createFileRoute("/api/rpc")({
  server: {
    handlers: {
      POST: ({ request }) => rpcHandler(request, ServiceMap.empty()),
    },
  },
});
