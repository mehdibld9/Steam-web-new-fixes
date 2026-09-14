import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Plus, LogOut, Coins, Trophy, Gift,
  MessageSquare, Menu, X, ChevronRight, Bell, Home,
  LayoutGrid, User, Settings, ShoppingBag, Sun, Moon, ArrowLeft,
  Megaphone, ExternalLink, Mail, Phone, MapPin, Crown, Heart, Reply,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import Footer from "./Footer";

async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await fetch("/api/messages/unread/count", { credentials: "include" });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchNotifications(): Promise<any[]> {
  const res = await fetch("/api/notifications", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

async function deleteNotification(id: number): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete notification");
}

async function deleteViewedNotifications(): Promise<void> {
  const res = await fetch("/api/notifications/viewed", {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete viewed notifications");
}


const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse", icon: LayoutGrid },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/giveaways", label: "Giveaways", icon: Gift },
  { href: "/store", label: "Store", icon: ShoppingBag },
  { href: "/premium", label: "Premium", icon: Crown },
];

export function Layout({ children, noFooter }: { children: React.ReactNode; noFooter?: boolean }) {
  const { data: user } = useGetMe();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages"],
    queryFn: fetchUnreadCount,
    enabled: false,
    refetchInterval: false,
  });

  const activeGiveaways: any[] = [];
  const newGiveaways: any[] = [];
  const {
    data: appNotifications = [],
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const {
    data: notifUnread = 0,
    refetch: refetchNotificationCount,
  } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread/count", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load notification count");
      const data = await res.json();
      return Number(data.count ?? 0);
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const notifCount = appNotifications.filter((notification) => !notification.isRead).length;

  const openBell = async () => {
    if (!bellOpen) {
      await Promise.all([
        refetchNotifications(),
        refetchNotificationCount(),
      ]);
    }
    setBellOpen(!bellOpen);
  };

  useEffect(() => {
    if (!bellOpen || appNotifications.length === 0) return;

    const timer = window.setTimeout(() => {
      void deleteViewedNotifications()
        .then(() => {
          queryClient.setQueryData<any[]>(["notifications"], []);
          queryClient.setQueryData(["notifications-unread-count"], 0);
        })
        .catch((error) => {
          console.error("Failed to delete viewed notifications", error);
        });
    }, 60_000);

    return () => window.clearTimeout(timer);
  }, [bellOpen, appNotifications.length, queryClient]);

  const handleNotificationClick = async (id: number) => {
    queryClient.setQueryData<any[]>(["notifications"], (current = []) =>
      current.filter((notification) => notification.id !== id),
    );
    queryClient.setQueryData(["notifications-unread-count"], (count = 0) =>
      Math.max(0, Number(count) - 1),
    );
    await deleteNotification(id);
    setBellOpen(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      await logout.mutateAsync(undefined);
    } catch {
      // ignore
    }
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
    setMenuOpen(false);
  };

  const xpProgress = user ? (user.xp % 100) : 0;

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<any[]>;
    },
    staleTime: 60_000,
  });

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupAnn, setPopupAnn] = useState<any>(null);

  useEffect(() => {
    const popupAnns = (announcements as any[]).filter((a: any) => a.isPopup);
    if (popupAnns.length === 0) return;
    const latest = popupAnns.sort((a: any, b: any) => b.id - a.id)[0];
    try {
      const dismissed = localStorage.getItem("dismissed_popup");
      if (dismissed !== String(latest.id)) {
        setPopupAnn(latest);
        setPopupOpen(true);
      }
    } catch {
      setPopupAnn(latest);
      setPopupOpen(true);
    }
  }, [announcements]);

  const dismissPopup = () => {
    if (popupAnn) {
      try { localStorage.setItem("dismissed_popup", String(popupAnn.id)); } catch {}
    }
    setPopupOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Popup Announcement */}
      {popupOpen && popupAnn && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismissPopup} />
          <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6">
            <button
              onClick={dismissPopup}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-3 mb-3">
              <Megaphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <h2 className="font-bold text-lg text-foreground leading-tight">{popupAnn.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-5 pl-8">{popupAnn.description}</p>
            {popupAnn.popupButtons && popupAnn.popupButtons.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popupAnn.popupButtons.map((btn: any, i: number) => (
                  <a
                    key={i}
                    href={btn.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={dismissPopup}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    {btn.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            ) : (
              <button
                onClick={dismissPopup}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      )}
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 items-center justify-between px-4">

          {/* Left: Logo (hidden on mobile) + Menu button + Back button */}
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden sm:flex items-center">
              <span className="font-black text-xl tracking-tight text-foreground">Steam Family</span>
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            {/* VIP / Premium */}
            <Link href="/premium">
              <button
                title="Go Premium"
                className="p-2 rounded transition-colors hover:bg-yellow-500/10"
              >
                <Crown className="h-4 w-4" style={{ color: "#F5C518", filter: "drop-shadow(0 0 4px #F5C51880)" }} />
              </button>
            </Link>

            {/* Dark mode toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {user ? (
              <>
                {(user.isAdmin || (user as any).isModerator) && (
                  <a href="https://admin.steamfamily.xyz" target="_blank" rel="noopener noreferrer">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/40 text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
                      <Shield className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{user.isAdmin ? "Admin" : "Mod"}</span>
                    </button>
                  </a>
                )}

                {/* Post Account */}
                <Link href="/submit">
                  <button className="relative p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors" title="Post Account">
                    <Plus className="h-5 w-5" />
                  </button>
                </Link>

                {/* Messages */}
                <Link href="/messages">
                  <button className="relative p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors" title="Messages">
                    <MessageSquare className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </Link>

                {/* Bell / Giveaway notifications */}
                <div className="relative" ref={bellRef}>
                  <button
                    onClick={openBell}
                    className="relative p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {notifCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {notifCount > 9 ? "9+" : notifCount}
                      </span>
                    )}
                  </button>

                  {/* Bell dropdown */}
                  {bellOpen && (
                    <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <span className="text-sm font-bold">Notifications</span>
                        <button onClick={() => setBellOpen(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {appNotifications.length === 0 && activeGiveaways.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No notifications yet
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto">
                          {/* App notifications (comment likes, etc.) */}
                          {appNotifications.map((n) => {
                            const inner = (
                              <div className={`w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors flex items-start gap-3 ${!n.isRead ? "bg-primary/5" : ""}`}>
                                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === "comment_reply" ? "bg-primary/10" : "bg-red-500/10"}`}>
                                  {n.type === "comment_reply"
                                    ? <Reply className="h-4 w-4 text-primary" />
                                    : <Heart className="h-4 w-4 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground">
                                    <span className="font-semibold">{n.actorUsername}</span>{" "}
                                    <span className="text-muted-foreground">{n.message}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                              </div>
                            );
                            return n.linkUrl ? (
                              <Link key={n.id} href={n.linkUrl}>
                                <button onClick={() => void handleNotificationClick(n.id)} className="w-full">{inner}</button>
                              </Link>
                            ) : (
                              <button key={n.id} onClick={() => void handleNotificationClick(n.id)} className="w-full">{inner}</button>
                            );
                          })}

                          {/* Active giveaways */}
                          {activeGiveaways.map((g) => (
                            <Link key={`g-${g.id}`} href="/giveaways">
                              <button onClick={() => setBellOpen(false)} className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Gift className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{g.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">Prize: {g.prize}</p>
                                    <p className="text-xs text-primary mt-0.5">{g.entriesCount}/{g.maxEntries} entries · Active</p>
                                  </div>
                                </div>
                              </button>
                            </Link>
                          ))}
                        </div>
                      )}

                      <div className="px-4 py-2.5 border-t border-border">
                        <Link href="/giveaways">
                          <button onClick={() => setBellOpen(false)} className="text-xs text-primary hover:underline font-medium">
                            View all giveaways →
                          </button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar + dropdown */}
                <div className="relative ml-1" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={user.avatarUrl || "/default-avatar.png"} />
                        <AvatarFallback className="text-xs bg-secondary">
                          {(user.username?.substring(0, 2) ?? "").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 bg-primary text-white text-[8px] font-black rounded px-[3px] leading-tight shadow-sm">
                        {user.level}
                      </div>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${profileOpen ? "" : "rotate-90"}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-11 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
                      <div className="px-4 py-2.5 border-b border-border">
                        {(() => {
                          const nc = (user as any).nameColor;
                          const ANIMATED_COLOR_MAP: Record<string, string> = { rainbow: "rainbow-text", fire: "fire-text", ocean: "ocean-text", galaxy: "galaxy-text", neon: "neon-text", gold: "gold-text", aurora: "aurora-text", sunset: "sunset-text", ice: "ice-text", toxic: "toxic-text", rose: "rose-text", lava: "lava-text" };
                          const cls = nc ? (ANIMATED_COLOR_MAP[nc] ?? null) : null;
                          return (
                            <p className={`text-sm font-semibold${cls ? ` ${cls}` : ""}`} style={!cls && nc ? { color: nc } : undefined}>
                              {(user as any).displayName || user.username}
                            </p>
                          );
                        })()}
                        <p className="text-xs text-primary">{user.points} pts · Lv {user.level}</p>
                      </div>
                      <Link href={`/profile/${user.id}`}>
                        <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors">
                          <User className="h-4 w-4" /> View Profile
                        </button>
                      </Link>
                      <Link href="/edit-profile">
                        <button onClick={() => setProfileOpen(false)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors">
                          <Settings className="h-4 w-4" /> Edit Profile
                        </button>
                      </Link>
                      <div className="border-t border-border mt-1 pt-1">
                        <button onClick={() => { setProfileOpen(false); handleLogout(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                          <LogOut className="h-4 w-4" /> Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* XP bar */}
        {user && (
          <div className="h-0.5 bg-muted">
            <div className="h-0.5 bg-primary transition-all duration-700" style={{ width: `${xpProgress}%` }} />
          </div>
        )}
      </header>

      {/* ── Menu Panel Overlay ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative z-50 w-72 h-full bg-card border-r border-border flex flex-col overflow-y-auto shadow-2xl menu-panel-enter">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-base font-bold text-foreground">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className="px-5 py-4 border-b border-border">
                <Link href={`/profile/${user.id}`} onClick={() => setMenuOpen(false)}>
                  <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={user.avatarUrl || "/default-avatar.png"} />
                      <AvatarFallback className="bg-secondary text-sm">
                        {(user.username?.substring(0, 2) ?? "").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{user.username}</p>
                      <p className="text-xs text-primary">{user.points} pts · Lv {user.level}</p>
                    </div>
                  </div>
                </Link>
                <div className="mt-3">
                  <Progress value={xpProgress} className="h-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">{user.xp % 100}/100 XP to next level</p>
                </div>
              </div>
            )}

            {/* Nav Items */}
            <nav className="flex-1 py-2">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className={`w-full flex items-center justify-between px-5 py-3 text-sm font-medium transition-colors ${
                      location === item.href
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground border-l-2 border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon && <item.icon className="h-4 w-4" />}
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </button>
                </Link>
              ))}

              <div className="my-2 mx-5 border-t border-border" />

              {user ? (
                <>
                  <Link href="/submit">
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground border-l-2 border-transparent transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <Plus className="h-4 w-4" />
                        Submit Account
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </button>
                  </Link>
                  <Link href="/messages">
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground border-l-2 border-transparent transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4" />
                        Messages
                        {unreadCount > 0 && (
                          <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </button>
                  </Link>
                  {(user.isAdmin || (user as any).isModerator) && (
                    <a href="https://admin.steamfamily.xyz" target="_blank" rel="noopener noreferrer" className="block">
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-primary hover:bg-primary/10 border-l-2 border-transparent transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          <Shield className="h-4 w-4" />
                          {user.isAdmin ? "Admin Panel" : "Mod Panel"}
                        </span>
                        <ChevronRight className="h-4 w-4 opacity-40" />
                      </button>
                    </a>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login">
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground border-l-2 border-transparent transition-colors"
                    >
                      <span>Login</span>
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </button>
                  </Link>
                  <Link href="/register">
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-primary hover:bg-primary/10 border-l-2 border-transparent transition-colors"
                    >
                      <span>Register</span>
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </button>
                  </Link>
                </>
              )}
            </nav>

            {/* Bottom logout */}
            {user && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      {!noFooter && <Footer />}
    </div>
  );
}
