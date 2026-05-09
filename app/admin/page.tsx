import React from "react";
import prisma from "@/lib/prisma";
import { Star, TrendingUp, Users, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Fetch counts from database
  const [activeTestimonials, activeStats, totalUsers, totalOrders] = await Promise.all([
    prisma.trustContent.count({ where: { type: "testimonial", isActive: true } }),
    prisma.trustContent.count({ where: { type: "stat", isActive: true } }),
    prisma.user.count(),
    prisma.order.count(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Dashboard Overview</h1>
        <p className="text-zinc-500 text-sm">Real-time metrics for the Wellora platform.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={totalUsers.toString()}
          icon={<Users className="h-5 w-5 text-purple-500" />}
          description="Registered platform accounts"
        />
        <MetricCard
          title="Total Orders"
          value={totalOrders.toString()}
          icon={<Activity className="h-5 w-5 text-green-500" />}
          description="Total transaction volume"
        />
        <MetricCard
          title="Active Testimonials"
          value={activeTestimonials.toString()}
          icon={<Star className="h-5 w-5 text-yellow-500" />}
          description="Live member success stories"
        />
        <MetricCard
          title="Active Stats"
          value={activeStats.toString()}
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          description="Live clinical performance metrics"
        />
      </div>

      {/* Database Warning if empty */}
      {activeTestimonials === 0 && activeStats === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500">No active trust content found.</p>
          <p className="text-xs text-zinc-400 mt-1">Activate content in the Trust Content section to see metrics here.</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  description 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{title}</span>
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{value}</span>
        <span className="text-[10px] text-zinc-400 font-medium">{description}</span>
      </div>
    </div>
  );
}
