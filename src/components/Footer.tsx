import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-fg">Vexon</span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              بوت إدارة شامل لسيرفرات Discord. إشراف، حماية تلقائية، تذاكر ذكاء اصطناعي، أوامر مخصصة، وأنظمة سيرفر كاملة — مع فحص صلاحيات وهرمية حقيقي على كل إجراء.
            </p>
            <p className="mt-4 text-xs text-muted">
              Built & owned by <span className="font-medium text-fg">f8_b</span>
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-fg">التنقل</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link to="/" className="transition hover:text-fg">
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link to="/features" className="transition hover:text-fg">
                  الميزات
                </Link>
              </li>
              <li>
                <Link to="/commands" className="transition hover:text-fg">
                  مرجع الأوامر
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="transition hover:text-fg">
                  لوحة التحكم
                </Link>
              </li>
              <li>
                <Link to="/quickstart" className="transition hover:text-fg">
                  البداية السريعة
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-fg">قانوني ودعم</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link to="/privacy" className="transition hover:text-fg">
                  سياسة الخصوصية
                </Link>
              </li>
              <li>
                <Link to="/terms" className="transition hover:text-fg">
                  شروط الاستخدام
                </Link>
              </li>
              <li>
                <Link to="/support" className="transition hover:text-fg">
                  الدعم والتواصل
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} Vexon. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
