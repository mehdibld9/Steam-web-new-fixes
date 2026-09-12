import React from "react";
import {
  Search,
  PlusCircle,
  Crown,
  HelpCircle,
  Send,
  Mail,
  Gift,
  Trophy,
  Megaphone,
  FileText,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M20.317 4.369A19.791 19.791 0 0016.945 3a13.05 13.05 0 00-.664 1.376 17.87 17.87 0 00-5.137 0A13.05 13.05 0 009.48 3 19.8 19.8 0 005.683 4.37C3.125 9.11 2.188 13.63 2.676 18.09a20.171 20.171 0 005.99 2.995c.464-.637.876-1.31 1.238-2.016-1.95-.577-3.446-1.576-3.446-1.576s.29.161.79.371c1.434.657 2.468 1.019 3.19 1.225a12.96 12.96 0 005.37-.02c.72-.206 1.754-.569 3.19-1.226.5-.21.79-.371.79-.371s-1.495.999-3.446 1.576c.362.706.774 1.379 1.238 2.016a20.169 20.169 0 005.99-2.995c.5-4.46-.45-8.98-3.008-13.72zM8.02 15.182c-1.003 0-1.826-.92-1.826-2.054 0-1.133.81-2.053 1.826-2.053 1.03 0 1.834.924 1.807 2.053 0 1.134-.777 2.054-1.807 2.054zm5.31 0c-1.003 0-1.826-.92-1.826-2.054 0-1.133.81-2.053 1.826-2.053 1.03 0 1.835.924 1.807 2.053 0 1.134-.778 2.054-1.807 2.054z" />
  </svg>
);

const iconClasses = "w-4 h-4 shrink-0";

export default function Footer(): JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card text-foreground">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4 lg:gap-8">
          <div>
            <h3 className="mb-3 text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
              Steam Family
            </h3>
            <ul className="space-y-2 text-[11px] text-muted-foreground sm:text-xs">
              <li>
                <a href="/browse" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Search className={`${iconClasses} text-cyan-400`} />
                  Explore Accounts
                </a>
              </li>
              <li>
                <a href="/terms" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <FileText className={`${iconClasses} text-sky-400`} />
                  Terms &amp; Rules
                </a>
              </li>
              <li>
                <a href="https://linktr.ee/mehdibld" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Megaphone className={`${iconClasses} text-rose-400`} />
                  Advertise
                </a>
              </li>
              <li>
                <a href="mailto:contact@steamfamily.xyz" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Mail className={`${iconClasses} text-emerald-400`} />
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:text-[11px]">Features</h4>
            <ul className="space-y-2 text-[11px] text-muted-foreground sm:text-xs">
              <li>
                <a href="/premium" className="inline-flex items-center gap-2 text-yellow-300 hover:text-yellow-200 transition-colors">
                  <Crown className={`${iconClasses}`} />
                  Buy Pro
                </a>
              </li>
              <li>
                <a href="/browse" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <ShoppingBag className={`${iconClasses} text-violet-400`} />
                  Shared Libraries
                </a>
              </li>
              <li>
                <a href="/submit" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <PlusCircle className={`${iconClasses} text-blue-400`} />
                  Submit Account
                </a>
              </li>
              <li>
                <a href="/store" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <ShoppingBag className={`${iconClasses} text-emerald-400`} />
                  Digital Store
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:text-[11px]">Help &amp; Support</h4>
            <ul className="space-y-2 text-[11px] text-muted-foreground sm:text-xs">
              <li>
                <a href="/faq" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <HelpCircle className={`${iconClasses} text-cyan-400`} />
                  FAQ
                </a>
              </li>
              <li>
                <a href="/faq" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <ChevronRight className={`${iconClasses} text-muted-foreground`} />
                  Launcher Bypasses
                </a>
              </li>
              <li>
                <a href="/faq" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <ChevronRight className={`${iconClasses} text-muted-foreground`} />
                  Steam Error Codes
                </a>
              </li>
              <li>
                <a href="mailto:contact@steamfamily.xyz" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Mail className={`${iconClasses} text-emerald-400`} />
                  contact@steamfamily.xyz
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:text-[11px]">Community</h4>
            <ul className="space-y-2 text-[11px] text-muted-foreground sm:text-xs">
              <li>
                <a href="https://t.me/Steam_Family" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Send className={`${iconClasses} text-sky-400`} />
                  Telegram
                </a>
              </li>
              <li>
                <a href="https://discord.gg/3w69MWQcuX" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <DiscordIcon className={`${iconClasses} text-violet-400`} />
                  Discord
                </a>
              </li>
              <li>
                <a href="/giveaways" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Gift className={`${iconClasses} text-emerald-400`} />
                  Giveaways
                </a>
              </li>
              <li>
                <a href="/leaderboard" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Trophy className={`${iconClasses} text-yellow-400`} />
                  Leaderboard
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Follow Us</span>
              <div className="flex items-center gap-3">
                <a href="https://t.me/Steam_Family" aria-label="Telegram" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/40 text-sky-500 transition hover:border-sky-400 hover:text-sky-400">
                  <Send className="h-4 w-4" />
                </a>
                <a href="https://discord.gg/3w69MWQcuX" aria-label="Discord" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/40 text-violet-500 transition hover:border-violet-400 hover:text-violet-400">
                  <DiscordIcon className="h-4 w-4" />
                </a>
                <a href="mailto:contact@steamfamily.xyz" aria-label="Email" className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/40 text-emerald-500 transition hover:border-emerald-400 hover:text-emerald-400">
                  <Mail className="h-4 w-4" />
                </a>
                <a href="https://linktr.ee/mehdibld" aria-label="Advertise" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/40 text-rose-500 transition hover:border-rose-400 hover:text-rose-400">
                  <Megaphone className="h-4 w-4" />
                </a>
                <a href="/premium" aria-label="Buy Pro" className="flex h-10 w-10 items-center justify-center rounded-md border border-yellow-500/70 bg-yellow-500/10 text-yellow-300 transition hover:bg-yellow-400 hover:text-black">
                  <Crown className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms &amp; Rules</a>
              <a href="/faq" className="hover:text-foreground transition-colors">FAQ</a>
              <a href="/premium" className="hover:text-foreground transition-colors">Buy Pro</a>
              <a href="mailto:contact@steamfamily.xyz" className="hover:text-foreground transition-colors">contact@steamfamily.xyz</a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">© {year} Steam Family. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
