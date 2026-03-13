import { createFileRoute } from "@tanstack/react-router";

import ApiStatus from "@/components/api-status";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h1 className="mb-1 text-xl font-semibold">Project Template</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            TanStack Start, Effect RPC, Better Auth, Drizzle, and shared workspace packages.
          </p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <ApiStatus />
        </section>
      </div>
    </div>
  );
}
