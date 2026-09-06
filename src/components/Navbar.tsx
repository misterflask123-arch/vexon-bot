import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Shield, Plus, LayoutDashboard } from "lucide-react";
import { INVITE_URL } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "الرئيسية" },
  { to: "/features", label: "الميزات" },
  { to: "/commands", label: "الأوامر" },
  { to: "/quickstart", label: "البداية السريعة" },
  { to: "/dashboard", label: "لوحة التحكم" },
  { to: "/support", label: "الدعم" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary transition group-hover:bg-primary/30">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-fg">Vexon</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-card hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="hidden min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-fg transition hover:bg-card-hover sm:inline-flex"
          >
            <LayoutDashboard className="h-4 w-4" />
            اللوحة
          </Link>
          <a
            href={INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover lg:inline-flex"
          >
            <Plus className="h-4 w-4" />
            أضف البوت
          </a>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-card hover:text-fg md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="القائمة"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-card md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-fg hover:bg-card-hover"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg"
            >
              <Plus className="h-4 w-4" />
              أضف البوت
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
