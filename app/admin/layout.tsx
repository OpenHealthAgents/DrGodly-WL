import React from "react";
import Link from "next/link";
import { LayoutDashboard, ShieldCheck, Users, Settings, LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: headers(),
  });

  const isAdmin = session?.user.role === "admin";

  if (!isAdmin) {
    redirect("/");
  }


  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-16 items-center border-b border-zinc-100 px-6 dark:border-zinc-900">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
            <ShieldCheck className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            Wellora Admin
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <SidebarLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <SidebarLink href="/admin/trust-content" icon={<Users className="h-4 w-4" />} label="Trust Content" />
          <SidebarLink href="/admin/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
        </nav>
        <div className="mt-auto border-t border-zinc-100 p-4 dark:border-zinc-900">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4" />
            Exit Admin
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center border-b border-zinc-100 bg-white px-8 dark:border-zinc-900 dark:bg-zinc-950">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Admin Control Center</h2>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
    >
      {icon}
      {label}
    </Link>
  );
}
