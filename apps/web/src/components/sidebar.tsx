"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, Car, ClipboardList, MessageCircle, UserCog, Settings } from "lucide-react";
import { useMe } from "@/hooks/use-me";

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
  { href: "/employees", label: "Empleados", icon: UserCog, permission: "MANAGE_EMPLOYEES" },
  { href: "/settings", label: "Configuración", icon: Settings, ownerOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();

  const canSee = (item: NavItem) => {
    if (!me) return true; // show all while loading to avoid layout shift
    if (item.ownerOnly) return me.isOwner;
    if (!item.permission) return true;
    if (me.isOwner) return true;
    return me.permissions.includes(item.permission);
  };

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-200">
        <span className="font-semibold text-gray-900 text-lg">
          {me?.workshop?.name ?? "TallerOS"}
        </span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.filter(canSee).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <UserButton />
      </div>
    </aside>
  );
}
