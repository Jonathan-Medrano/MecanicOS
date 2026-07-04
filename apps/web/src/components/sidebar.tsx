"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, Car, ClipboardList, MessageCircle, UserCog, Settings, X, BookOpen, Bot } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { useUnreadCount } from "@/hooks/use-unread-count";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  ownerOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users, permission: "VIEW_CLIENTS" },
  { href: "/vehicles", label: "Vehículos", icon: Car, permission: "VIEW_VEHICLES" },
  { href: "/work-orders", label: "Órdenes", icon: ClipboardList, permission: "VIEW_ORDERS" },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, permission: "VIEW_WHATSAPP" },
  { href: "/assistant", label: "Asistente IA", icon: Bot },
  { href: "/guides", label: "Guías técnicas", icon: BookOpen },
  { href: "/employees", label: "Empleados", icon: UserCog, permission: "MANAGE_EMPLOYEES" },
  { href: "/settings", label: "Configuración", icon: Settings, ownerOnly: true },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const unreadCount = useUnreadCount();

  const canSee = (item: NavItem) => {
    if (!me) return true;
    if (item.ownerOnly) return me.isOwner;
    if (!item.permission) return true;
    if (me.isOwner) return true;
    return me.permissions.includes(item.permission);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-gray-200
          transition-transform duration-200 ease-in-out
          md:static md:inset-auto md:z-auto md:w-56 md:shrink-0 md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-lg truncate">
            {me?.workshop?.name ?? "TallerOS"}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 shrink-0"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV.filter(canSee).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            const badge = href === "/whatsapp" && unreadCount > 0 ? unreadCount : 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="ml-auto bg-green-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-200">
          <UserButton />
        </div>
      </aside>
    </>
  );
}
