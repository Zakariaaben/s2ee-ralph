import { createFileRoute } from "@tanstack/react-router";
import { ServiceMap } from "effect";
import type * as ServiceMapNamespace from "effect/ServiceMap";

import { rpcHandler } from "@/server/rpc/handler";

export const Route = createFileRoute("/api/rpc")({
  server: {
    handlers: {
      POST: ({ request }) =>
        rpcHandler(
          request,
          ServiceMap.empty() as ServiceMapNamespace.ServiceMap<any>,
        ),
    },
  },
});
