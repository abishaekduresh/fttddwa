"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState, useCallback } from "react";
import { Users, UserCheck, TrendingUp, MapPin, Plus, Download, Cake, Heart, Phone, BellOff } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import toast from "react-hot-toast";

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  expiredMembers: number;
  totalUsers: number;
  newMembersThisMonth: number;
  recentMembers: Array<{
    id: number;
    membershipId: string;
    name: string;
    district: string;
    phone: string;
    status: string;
    createdAt: string;
  }>;
  membersByDistrict: Array<{ district: string; count: number }>;
  recentActivity: Array<{
    id: number;
    action: string;
    resource: string;
    userEmail: string;
    ipAddress: string;
    createdAt: string;
    status: string;
  }>;
  upcomingCelebrations: Array<{
    id: number;
    membershipId: string;
    name: string;
    phone: string;
    district: string;
    type: "birthday" | "wedding";
    daysUntil: number;
    monthDay: string;
  }>;
}

const statusColors: Record<string, string> = {
  ACTIVE: "badge badge-green",
  INACTIVE: "badge badge-gray",
  SUSPENDED: "badge badge-red",
  EXPIRED: "badge badge-yellow",
};

type CelebrationItem = DashboardStats["upcomingCelebrations"][number];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebrations, setCelebrations] = useState<CelebrationItem[]>([]);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((j) => {
        setStats(j.data);
        setCelebrations(j.data?.upcomingCelebrations ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleMute = useCallback(async (c: CelebrationItem) => {
    // Optimistic removal
    setCelebrations((prev) => prev.filter((x) => !(x.id === c.id && x.type === c.type)));
    try {
      const res = await apiFetch(`/api/members/${c.id}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c.type === "birthday" ? { notifyBirthday: false } : { notifyWedding: false }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${c.type === "birthday" ? "Birthday" : "Anniversary"} notification muted for ${c.name}`);
    } catch {
      toast.error("Failed to save notification setting");
      setCelebrations((prev) => [...prev, c].sort((a, b) => a.daysUntil - b.daysUntil));
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 h-28 bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Members",
      value: stats?.totalMembers || 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      change: `+${stats?.newMembersThisMonth || 0} this month`,
    },
    {
      label: "Active Members",
      value: stats?.activeMembers || 0,
      icon: UserCheck,
      color: "bg-green-50 text-green-600",
      change: `${stats?.inactiveMembers || 0} inactive`,
    },
    {
      label: "New This Month",
      value: stats?.newMembersThisMonth || 0,
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
      change: "Last 30 days",
    },
    {
      label: "Expired Members",
      value: stats?.expiredMembers || 0,
      icon: BellOff,
      color: "bg-red-50 text-red-600",
      change: "Requires renewal",
    },
    {
      label: "Districts Covered",
      value: stats?.membersByDistrict?.length || 0,
      icon: MapPin,
      color: "bg-orange-50 text-orange-600",
      change: "Across Tamil Nadu",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">Overview of FTTDDWA member data</p>
        </div>
        <div className="flex gap-2">
          <Link href="/members/new" className="btn btn-primary">
            <Plus size={16} /> Add Member
          </Link>
          <Link
            href="/api/members/export?format=excel"
            className="btn btn-outline"
            target="_blank"
          >
            <Download size={16} /> Export
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Celebrations */}
      {celebrations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <h2 className="font-semibold text-slate-900">Upcoming Celebrations</h2>
            <span className="ml-auto text-xs text-slate-400">{celebrations.length} this week</span>
          </div>
          <div className="divide-y divide-slate-100">
            {celebrations.map((c, i) => {
              const isToday = c.daysUntil === 0;
              const isTomorrow = c.daysUntil === 1;
              const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : `In ${c.daysUntil} days`;
              const labelClass = isToday
                ? "bg-pink-100 text-pink-700"
                : isTomorrow
                ? "bg-orange-100 text-orange-700"
                : "bg-slate-100 text-slate-600";
              return (
                <div key={`${c.id}-${c.type}-${i}`} className={`flex items-center gap-3 px-4 py-3 group ${isToday ? "bg-pink-50/40" : isTomorrow ? "bg-orange-50/30" : ""}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.type === "birthday" ? "bg-pink-100 text-pink-600" : "bg-rose-100 text-rose-600"}`}>
                    {c.type === "birthday" ? <Cake size={16} /> : <Heart size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/members/${c.id}`} className="font-medium text-slate-900 hover:text-primary text-sm leading-tight">
                        {c.name}
                      </Link>
                      <span className="font-mono text-xs text-slate-400">{c.membershipId}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-500">{c.type === "birthday" ? "Birthday" : "Wedding Anniversary"} · {c.district}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                        <Phone size={10} className="text-slate-400" />{c.phone}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${labelClass}`}>{label}</span>
                  <button
                    onClick={() => handleMute(c)}
                    title={`Mute ${c.type === "birthday" ? "birthday" : "anniversary"} notification`}
                    className="p-1.5 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <BellOff size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Members */}
        <div className="card lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Members</h2>
            <Link href="/members" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Member ID</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">District</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentMembers?.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/members/${member.id}`} className="font-mono text-primary hover:underline text-xs">
                        {member.membershipId}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">{member.name}</td>
                    <td className="px-5 py-3 text-slate-500">{member.district}</td>
                    <td className="px-5 py-3">
                      <span className={statusColors[member.status] || "badge badge-gray"}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(member.createdAt)}</td>
                  </tr>
                ))}
                {!stats?.recentMembers?.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No members yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* District Distribution */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Members by District</h2>
          </div>
          <div className="p-5 space-y-3">
            {stats?.membersByDistrict?.map((d) => {
              const percentage = stats.totalMembers
                ? Math.round((d.count / stats.totalMembers) * 100)
                : 0;
              return (
                <div key={d.district}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium truncate">{d.district}</span>
                    <span className="text-slate-500 ml-2 flex-shrink-0">{d.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div
                      className="h-1.5 bg-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!stats?.membersByDistrict?.length && (
              <p className="text-slate-400 text-sm text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          <Link href="/audit-logs" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {stats?.recentActivity?.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${log.status === "SUCCESS" ? "bg-green-500" : "bg-red-500"}`} />
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{log.action}</span>
                    {" "}<span className="text-slate-400">on</span>{" "}
                    <span className="text-slate-600">{log.resource}</span>
                  </p>
                  <p className="text-xs text-slate-400 truncate">{log.userEmail}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">{formatDateTime(log.createdAt)}</p>
            </div>
          ))}
          {!stats?.recentActivity?.length && (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
