import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Menu, X, Gamepad2 } from "lucide-react";
import { categories, gamesDescription, type Command } from "@/lib/commands-data";
import { CopyButton } from "@/components/CopyButton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/commands")({
  head: () => ({
    meta: [{ title: "مرجع الأوامر | Vexon" }],
  }),
  component: CommandsPage,
});

function Badge({ type, label }: { type: Command["permissionType"]; label: string }) {
  const cls =
    type === "admin"
      ? "badge-admin"
      : type === "staff"
        ? "badge-staff"
        : type === "everyone"
          ? "badge-everyone"
          : "badge-perm";
  return <span className={cn("badge", cls)}>{label}</span>;
}

function CommandsPage() {
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .map((cat) => ({
        ...cat,
        commands: cat.commands.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.syntax.toLowerCase().includes(q) ||
            c.description.includes(q) ||
            cat.title.includes(q),
        ),
      }))
      .filter((cat) => cat.commands.length > 0 || (cat.id === "games" && cat.title.includes(q)));
  }, [query]);

  const scrollTo = (id: string) => {
    setSidebarOpen(false);
    setActiveCat(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">مرجع الأوامر</h1>
        <p className="mt-2 max-w-2xl text-muted">
          توثيق كامل لكل أوامر Vexon. استخدم البحث أو القائمة الجانبية للانتقال السريع.
        </p>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="ابحث عن أمر..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-card py-3 pr-10 pl-4 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sidebar-sticky space-y-1">
            <p className="mb-2 px-2 text-xs font-semibold tracking-wider text-muted">الفئات</p>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => scrollTo(cat.id)}
                className={cn(
                  "block w-full rounded-lg px-3 py-2.5 text-right text-sm transition",
                  activeCat === cat.id
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-muted hover:bg-card hover:text-fg",
                )}
              >
                {cat.title}
                <span className="mr-1 text-xs opacity-60">
                  ({cat.id === "games" ? "—" : cat.commands.length})
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <button
          type="button"
          className="fixed bottom-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="الفئات"
        >
          <Menu className="h-5 w-5" />
        </button>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="drawer-overlay absolute inset-0" onClick={() => setSidebarOpen(false)} />
            <div className="absolute inset-y-0 right-0 w-72 border-l border-border bg-card p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-semibold">الفئات</span>
                <button type="button" className="h-11 w-11" onClick={() => setSidebarOpen(false)} aria-label="إغلاق">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => scrollTo(cat.id)}
                    className="block w-full rounded-lg px-3 py-3 text-right text-sm text-fg hover:bg-card-hover"
                  >
                    {cat.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-12">
          {filtered.map((cat) => (
            <section key={cat.id} id={cat.id} className="scroll-mt-24">
              <div className="mb-5 border-b border-border pb-3">
                <h2 className="text-2xl font-bold">{cat.title}</h2>
                <p className="mt-1 text-sm text-muted">{cat.description}</p>
              </div>

              {cat.id === "games" ? (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-relaxed text-fg/90">{gamesDescription}</p>
                  <div className="mt-4">
                    <code className="command-code rounded-lg bg-bg px-3 py-1.5 text-sm text-primary">
                      /games play
                    </code>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {cat.commands.map((cmd) => (
                    <article
                      key={cmd.id}
                      id={cmd.id}
                      className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="command-code font-mono text-lg font-semibold text-primary">{cmd.name}</h3>
                          <div className="mt-2">
                            <Badge type={cmd.permissionType} label={cmd.permission} />
                          </div>
                        </div>
                        <CopyButton text={cmd.syntax} />
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-bg/80">
                        <pre className="command-code px-4 py-3 text-sm whitespace-pre-wrap text-fg/90">
                          {cmd.syntax}
                        </pre>
                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-fg/85">{cmd.description}</p>

                      {cmd.options.length > 0 && (
                        <div className="mt-5 overflow-x-auto rounded-lg border border-border">
                          <table className="options-table">
                            <thead>
                              <tr>
                                <th>الاسم</th>
                                <th>النوع</th>
                                <th>مطلوب</th>
                                <th>الشرح</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cmd.options.map((opt) => (
                                <tr key={opt.name}>
                                  <td className="opt-name">{opt.name}</td>
                                  <td className="text-muted">{opt.type}</td>
                                  <td>
                                    {opt.required ? (
                                      <span className="text-xs font-medium text-danger">إجباري</span>
                                    ) : (
                                      <span className="text-xs text-muted">اختياري</span>
                                    )}
                                  </td>
                                  <td className="text-fg/80">{opt.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}

          {filtered.length === 0 && query && (
            <p className="py-12 text-center text-muted">لا توجد نتائج مطابقة لـ «{query}»</p>
          )}
        </div>
      </div>
    </div>
  );
}
