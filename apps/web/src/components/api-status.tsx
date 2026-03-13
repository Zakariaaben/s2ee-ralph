import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@project/ui/components/card";
import { Skeleton } from "@project/ui/components/skeleton";
import { Button } from "@project/ui/components/button";
import { Cause } from "effect";
import { useEffect, useState } from "react";

import { AppRpcClient } from "@/lib/rpc-client";

function ApiStatusContent() {
  const health = useAtomValue(AppRpcClient.query("health", undefined));
  const refresh = useAtomRefresh(AppRpcClient.query("health", undefined));

  if (health._tag === "Initial" || health.waiting) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (health._tag === "Failure") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Effect RPC</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Request failed.</p>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
            {Cause.pretty(health.cause)}
          </pre>
          <Button onClick={refresh} size="sm" type="button" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const healthValue = health.value;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Effect RPC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>Status: {healthValue.status}</p>
        <p>Responded at: {healthValue.timestamp}</p>
      </CardContent>
    </Card>
  );
}

function ApiStatusFallback() {
  return <Skeleton className="h-40 w-full" />;
}

export default function ApiStatus() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ApiStatusFallback />;
  }

  return <ApiStatusContent />;
}
