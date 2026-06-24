"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import {
  LayoutDashboard,
  FolderKanban,
  MapIcon,
  Layers3,
  BookOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Brain,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const topNavItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
];

function getProjectNavItems(projectId: string) {
  return [
    {
      href: `/projects/${projectId}`,
      icon: LayoutDashboard,
      label: "Overview",
      exact: true,
    },
    {
      href: `/projects/${projectId}/features`,
      icon: Sparkles,
      label: "Features",
    },
    {
      href: `/projects/${projectId}/epics`,
      icon: Layers3,
      label: "Epics",
    },
    {
      href: `/projects/${projectId}/roadmap`,
      icon: MapIcon,
      label: "Roadmap",
    },
    {
      href: `/projects/${projectId}/memory`,
      icon: Brain,
      label: "AI Memory",
    },
  ];
}

const bottomNavItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  exact?: boolean;
}

function NavItem({ href, icon: Icon, label, collapsed, exact }: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { activeProjectId } = useWorkspaceStore();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        sidebarCollapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Brain className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">
              ProductPilot
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Top nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-none">
        {topNavItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            collapsed={sidebarCollapsed}
            exact={item.href === "/"}
          />
        ))}

        {/* Project-scoped nav */}
        {activeProjectId && (
          <>
            {!sidebarCollapsed && (
              <p className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Project
              </p>
            )}
            {sidebarCollapsed && <div className="my-2 border-t border-sidebar-border" />}
            {getProjectNavItems(activeProjectId).map((item) => (
              <NavItem
                key={item.href}
                {...item}
                collapsed={sidebarCollapsed}
              />
            ))}
          </>
        )}

        {!sidebarCollapsed && (
          <p className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            Coming soon
          </p>
        )}
        {sidebarCollapsed && <div className="my-2 border-t border-sidebar-border" />}
        <NavItem
          href="/analytics"
          icon={BarChart3}
          label="Analytics"
          collapsed={sidebarCollapsed}
        />
        <NavItem
          href="/docs"
          icon={BookOpen}
          label="Documentation"
          collapsed={sidebarCollapsed}
        />
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border p-2">
        {bottomNavItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            collapsed={sidebarCollapsed}
          />
        ))}
      </div>
    </aside>
  );
}
