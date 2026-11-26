import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useGetMe } from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Shield, ShieldOff } from "lucide-react";
import { Link } from "wouter";

const TWO_FACTOR_QUERY_KEY = ["admin-two-factor"];
const FULL_ADMIN_PANEL_URL = "https://admin.steamfamily.xyz";

export default function AdminSettings() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: TWO_FACTOR_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/site-settings/two-factor", {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to load two-factor settings.");
      }
      return response.json() as Promise<{ enabled: boolean }>;
    },
    enabled: !!user?.isAdmin,
  });

  const updateSetting = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/site-settings/two-factor", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update two-factor settings.");
      }
      return response.json() as Promise<{ enabled: boolean }>;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(TWO_FACTOR_QUERY_KEY, settings);
    },
  });

  if (userLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-10 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!user?.isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-2">Admin access required</h1>
          <p className="text-muted-foreground mb-6">
            These settings are available to administrators only.
          </p>
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the site-wide email two-factor authentication system.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {settingsQuery.data?.enabled ? (
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <h2 className="font-semibold">Email two-factor authentication</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {settingsQuery.data?.enabled
                    ? "Users with 2FA enabled receive email codes when signing in and deleting their account."
                    : "Email 2FA challenges are paused for sign-in and account deletion. Users’ individual preferences are preserved."}
                </p>
              </div>
            </div>
            {settingsQuery.isLoading ? (
              <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
            ) : settingsQuery.data ? (
              <Switch
                aria-label="Enable site-wide email two-factor authentication"
                checked={settingsQuery.data.enabled}
                onCheckedChange={(enabled) => updateSetting.mutate(enabled)}
                disabled={updateSetting.isPending || settingsQuery.isError}
              />
            ) : null}
          </div>

          {settingsQuery.isError && (
            <p role="alert" className="text-sm text-destructive">
              {settingsQuery.error instanceof Error
                ? settingsQuery.error.message
                : "Failed to load two-factor settings."}
            </p>
          )}
          {updateSetting.isError && (
            <p role="alert" className="text-sm text-destructive">
              {updateSetting.error instanceof Error
                ? updateSetting.error.message
                : "Failed to update two-factor settings."}
            </p>
          )}
        </section>

        <a
          href={FULL_ADMIN_PANEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 text-primary hover:bg-primary/10 transition-colors"
        >
          <span>
            <span className="block font-semibold">See full Admin Panel</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Open the full administration website.
            </span>
          </span>
          <ExternalLink className="h-5 w-5 shrink-0" />
        </a>
      </main>
    </Layout>
  );
}
