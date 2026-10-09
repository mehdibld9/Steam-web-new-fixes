import { useListAccounts, useGetMe, getListAccountsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { AccountCard } from "@/components/account-card";
import { AdBanner } from "@/components/ad-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pin, ChevronRight, Plus, Users, Search, CircleHelp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

async function fetchStats() {
  const res = await fetch("/api/stats", { credentials: "include" });
  if (!res.ok) return null;
  return res.json() as Promise<{ totalUsers: number; totalAccounts: number }>;
}

async function fetchAnnouncements() {
  const res = await fetch("/api/announcements", { credentials: "include" });
  if (!res.ok) return [];
  return res.json() as Promise<any[]>;
}

async function fetchTicker() {
  const res = await fetch("/api/site-settings/ticker", { credentials: "include" });
  if (!res.ok) return null;
  return res.json() as Promise<{ enabled: boolean; icon: string; text: string; linkLabel: string; linkUrl: string }>;
}

async function pinAccount(accountId: number, pinned: boolean) {
  const res = await fetch(`/api/accounts/${accountId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPinned: pinned }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
  return res.json();
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const {
    data: accountsData,
    isLoading: accountsLoading,
    isError: accountsError,
    refetch: refetchAccounts,
  } = useListAccounts(
    { sort: "recent", limit: 12 },
    {
      query: {
        queryKey: getListAccountsQueryKey({ sort: "recent", limit: 12 }),
        retry: false,
      },
    },
  );
  const { data: announcements = [] } = useQuery({ queryKey: ["announcements"], queryFn: fetchAnnouncements });
  const { data: ticker } = useQuery({ queryKey: ["ticker"], queryFn: fetchTicker });
  const { data: me } = useGetMe();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const queryClient = useQueryClient();

  const handlePin = async (accountId: number) => {
    await pinAccount(accountId, true);
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey({ sort: "recent", limit: 12 }) });
  };
  const handleUnpin = async (accountId: number) => {
    await pinAccount(accountId, false);
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey({ sort: "recent", limit: 12 }) });
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q) {
      navigate(`/browse?search=${encodeURIComponent(q)}`);
    } else {
      navigate("/browse");
    }
  };

  const accountsList = accountsData?.accounts ?? [];
  const hitLimit = accountsList.length >= 12;

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="container relative z-10 mx-auto px-4 py-20 md:py-32 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-6 leading-tight">
            Welcome to{" "}
            <span className="text-primary">Steam Family</span>
          </h1>

          {/* Ticker bar — admin controlled */}
          {ticker?.enabled && ticker.text && (
            <div className="inline-flex items-center gap-3 bg-card border border-border rounded-full px-4 py-2 mb-6 shadow-sm">
              {ticker.icon && (
                ticker.icon.startsWith("http")
                  ? <img src={ticker.icon} alt="" className="h-5 w-5 object-contain shrink-0" />
                  : <span className="text-lg leading-none">{ticker.icon}</span>
              )}
              <span className="text-sm font-semibold text-foreground">{ticker.text}</span>
              {ticker.linkLabel && ticker.linkUrl && (
                <a
                  href={ticker.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-muted border border-border rounded-full px-3 py-1 text-xs font-bold hover:bg-muted/70 transition-colors text-foreground"
                >
                  {ticker.linkLabel}
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
            </div>
          )}

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mb-6">
            Share unused Steam libraries, claim games you want, and rise through the ranks in the most active gaming exchange.
          </p>

          {stats && (
            <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Join <span className="font-black text-primary">{stats.totalUsers >= 100_000 ? `${Math.floor(stats.totalUsers / 1000)}k` : stats.totalUsers.toLocaleString()}</span> members already in the community</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/browse">
              <Button size="lg" className="font-bold px-8 h-12" data-testid="button-browse-hero">
                Explore Accounts
              </Button>
            </Link>
            {me ? (
              <Link href="/submit">
                <Button size="lg" variant="outline" className="font-bold px-8 h-12 border-border hover:border-primary/50 gap-2" data-testid="button-post-acc-hero">
                  <Plus className="h-4 w-4" />
                  Post Account
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="lg" variant="outline" className="font-bold px-8 h-12 border-border hover:border-primary/50" data-testid="button-join-hero">
                  Join Community
                </Button>
              </Link>
            )}
          </div>

          {/* Animated search bar */}
          <div className="relative mt-8 w-full max-w-2xl mx-auto">
            {/* Pulsing glow layer behind the input */}
            <div
              className="absolute -inset-[2px] rounded-xl bg-primary/50 blur-[4px] animate-pulse pointer-events-none"
              style={{ animationDuration: "1.8s" }}
            />
            {/* Input row */}
            <div className="relative flex items-center bg-background rounded-xl border border-primary/40 overflow-hidden shadow-lg">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground pointer-events-none shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search…"
                className="w-full bg-transparent pl-12 pr-3 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                onClick={handleSearch}
                className="m-1.5 shrink-0 font-semibold"
                size="sm"
              >
                Search
              </Button>
            </div>
          </div>

        </div>
      </section>

      <div className="container mx-auto px-4 pt-6">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-border bg-card/70 px-4 py-3 text-center text-sm shadow-sm">
          <CircleHelp className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-semibold text-foreground">New here?</span>
          <span className="text-muted-foreground">
            Earn points by sharing accounts or subscribing to Premium.
          </span>
          <Link
            href="/faq#how-do-i-get-points"
            className="font-semibold text-yellow-400 underline underline-offset-2 hover:text-yellow-300"
          >
            Learn how to get points
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 space-y-10">

        {/* Announcements */}
        {announcements.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-5 bg-primary rounded-sm inline-block" />
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Site News
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {announcements.map((a: any) => (
                <div
                  key={a.id}
                  className="relative bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-2xl rounded-full pointer-events-none" />
                  <div className="relative z-10 flex items-start gap-3">
                    {a.pinned && (
                      <Pin className="h-4 w-4 text-primary mt-0.5 shrink-0 rotate-45" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{a.title}</h3>
                        <span className="text-[11px] text-muted-foreground">
                          by {a.authorUsername} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{a.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Latest Accounts */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 bg-primary rounded-sm inline-block" />
              <div>
                <h2 className="text-xl font-bold">Latest Accounts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Freshly dropped accounts ready to be claimed.</p>
              </div>
            </div>
            <Link href="/browse">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 flex items-center gap-1">
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <AdBanner placement="home" />

          {accountsLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : accountsError ? (
            <div className="py-12 text-center border border-dashed border-destructive/40 rounded-xl">
              <p className="text-muted-foreground">Accounts are temporarily unavailable.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => refetchAccounts()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {accountsList.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    isAdmin={(me as any)?.isAdmin}
                    onPin={handlePin}
                    onUnpin={handleUnpin}
                  />
                ))}
                {accountsList.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    No accounts yet. Be the first to upload!
                  </div>
                )}
              </div>

              {/* Load More → browse page */}
              {hitLimit && (
                <div className="flex justify-center pt-6">
                  <Link href="/browse">
                    <Button
                      variant="outline"
                      size="lg"
                      className="px-10 font-semibold border-primary/30 hover:border-primary/60 hover:bg-primary/5 gap-2"
                    >
                      Load More <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
