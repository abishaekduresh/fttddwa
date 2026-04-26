"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Users, UserCheck, Shield,
  ClipboardList, FileDown, Settings, ChevronLeft, ChevronRight,
  Building2, BookOpen, X, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/store/auth.store";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: null,
  },
  {
    label: "Members",
    href: "/members",
    icon: UserCheck,
    permission: "members:read",
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    permission: "users:read",
  },
  {
    label: "Roles",
    href: "/roles",
    icon: Shield,
    permission: "roles:read",
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: ClipboardList,
    permission: "audit:read",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileDown,
    permission: "members:export",
  },
  {
    label: "WhatsApp",
    href: "/whatsapp",
    icon: MessageCircle,
    permission: "whatsapp:read",
  },
  {
    label: "API Docs",
    href: "/docs",
    icon: BookOpen,
    permission: "settings:manage",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permission: null,
  },
];

import { useAssociation } from "@/hooks/use-association";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuthStore();
  const { settings } = useAssociation();

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-30",
        // Mobile: always w-64, slides in/out via translate
        "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: no translate, width toggles between w-64 and w-16
        "lg:translate-x-0",
        !isOpen && "lg:w-16"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
            {settings?.logo1Url ? (
              <Image src={settings.logo1Url} alt="Logo" width={32} height={32} className="w-full h-full object-cover" />
            ) : (
              <Building2 size={16} className="text-white" />
            )}
          </div>
          <div className={cn("overflow-hidden", !isOpen && "lg:hidden")}>
            <p className="text-sm font-bold text-slate-900 leading-tight truncate">
              {settings?.shortName || "FTTDDWA"}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {settings?.tagline || "Member Portal"}
            </p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onToggle}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                // Close sidebar drawer after navigation on mobile
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  onToggle();
                }
              }}
              className={cn(
                "sidebar-link",
                isActive ? "sidebar-link-active" : "sidebar-link-inactive"
              )}
              title={!isOpen ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {/* Always show label on mobile; hide on desktop when collapsed */}
              <span className={cn("truncate", !isOpen && "lg:hidden")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse button — desktop only */}
      <div className="hidden lg:block p-3 border-t border-slate-200">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md text-sm transition-colors"
        >
          {isOpen ? (
            <><ChevronLeft size={16} /><span>Collapse</span></>
          ) : (
            <ChevronRight size={16} />
          )}
        </button>
      </div>
    </aside>
  );
}
