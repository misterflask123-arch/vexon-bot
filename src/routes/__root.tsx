import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "Vexon — بوت إدارة ديسكورد متقدم";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "بوت إدارة شامل لسيرفرات Discord: إشراف، AutoMod، تذاكر ذكاء اصطناعي، أوامر مخصصة، وحماية دعوات — مع لوحة تحكم ويب كاملة.",
      },
      { name: "theme-color", content: "#0b0e14" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/login");

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col bg-bg text-fg antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          {isDashboard ? (
            <Outlet />
          ) : (
            <>
              <Navbar />
              <main className="flex-1">
                <Outlet />
              </main>
              <Footer />
            </>
          )}
          <Toaster
            theme="dark"
            dir="rtl"
            position="top-center"
            toastOptions={{
              style: {
                background: "#12161f",
                border: "1px solid #1e2533",
                color: "#e8eaed",
                fontFamily: "Cairo, system-ui, sans-serif",
              },
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
