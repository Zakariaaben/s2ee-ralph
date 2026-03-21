import { Button } from "@project/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@project/ui/components/card";
import { Input } from "@project/ui/components/input";
import { Skeleton } from "@project/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@project/ui/components/tabs";
import { Textarea } from "@project/ui/components/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Clean, simple, and ready to extend.
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              A minimal front page with a few polished interface elements.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>A small row of common actions.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button loading>Loading</Button>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline">
                Continue
                <ArrowRightIcon />
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signals</CardTitle>
              <CardDescription>Lightweight status and loading elements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Simple inputs and content areas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="form" className="gap-6">
              <TabsList>
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="form">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input placeholder="First input" />
                  <Input placeholder="Second input" />
                  <div className="md:col-span-2">
                    <Textarea placeholder="Textarea preview" className="min-h-28" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Card One</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Small nested card example.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Card Two</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Same primitives, different arrangement.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Card Three</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Useful for quick visual verification.
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="summary">
                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>The page stays intentionally light.</p>
                  <p>It leaves room for the next layer of product work.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
