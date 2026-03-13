import { makeAuth } from "@project/auth";
import { createMiddleware } from "@tanstack/react-start";

import { serverRuntime } from "@/server/runtime";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const auth = await serverRuntime.runPromise(makeAuth);
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  return next({
    context: { session },
  });
});
