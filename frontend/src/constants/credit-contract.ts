import {
  Home,
  TrendingDown,
  CreditCard,
  PieChart,
  PiggyBank,
  History,
  Users,
} from "lucide-react"

// Role types
export type UserRole = 'admin' | 'collector' | 'debtor';

// Navigation item with role restrictions
export interface NavigationItem {
  id: string;
  title: string;
  icon: any;
  href?: string;
  iconBg: string;
  hoverColor: string;
  badge?: { count: number; color: string; show: boolean } | number;
  onClick?: () => void;
  roles: UserRole[]; // Allowed roles
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    title: "Chính",
    items: [
      {
        id: "home",
        title: "Trang chủ",
        icon: Home,
        href: "/",
        iconBg: "bg-blue-100",
        hoverColor: "hover:bg-blue-50 hover:text-blue-700",
        badge: undefined,
        onClick: undefined,
        roles: ['admin'], // Dashboard is admin only
      },
      {
        id: "debtor-home",
        title: "Tổng quan",
        icon: Home,
        href: "/debtor",
        iconBg: "bg-teal-100",
        hoverColor: "hover:bg-teal-50 hover:text-teal-700",
        badge: undefined,
        onClick: undefined,
        roles: ['debtor'], // Debtor Dashboard
      },
      {
        id: "no-phai-thu",
        title: "Nợ phải thu",
        icon: TrendingDown,
        href: "/nophaithu",
        badge: {
          count: 0,
          color: "bg-red-500 text-white",
          show: true
        },
        iconBg: "bg-red-100",
        hoverColor: "hover:bg-red-50 hover:text-red-700",
        onClick: undefined,
        roles: ['admin', 'collector'], // Admin and Collector
      },
    ],
  },
  {
    title: "Giao dịch",
    items: [
      {
        id: "credit",
        title: "Tín chấp",
        icon: CreditCard,
        href: "/tinchap",
        iconBg: "bg-green-100",
        hoverColor: "hover:bg-green-50 hover:text-green-700",
        badge: undefined,
        onClick: undefined,
        roles: ['admin'], // Admin only
      },
      {
        id: "installment",
        title: "Trả góp",
        icon: PiggyBank,
        iconBg: "bg-purple-100",
        hoverColor: "hover:bg-purple-50 hover:text-purple-700",
        badge: undefined,
        href: "/tragop",
        onClick: undefined,
        roles: ['admin'], // Admin only
      },
    ],
  },
  {
    title: "Quản lý",
    items: [
      {
        id: "lichsu",
        title: "Lịch sử",
        icon: History,
        iconBg: "bg-gray-100",
        hoverColor: "hover:bg-gray-50 hover:text-gray-700",
        badge: undefined,
        href: "/lichsu",
        onClick: undefined,
        roles: ['admin'], // Admin only
      },
      {
        id: "statistics",
        title: "Thống kê",
        icon: PieChart,
        iconBg: "bg-blue-100",
        hoverColor: "hover:bg-blue-50 hover:text-blue-700",
        badge: undefined,
        href: "/thongke",
        onClick: undefined,
        roles: ['admin'], // Admin only
      },
      {
        id: "users",
        title: "Người dùng",
        icon: Users,
        iconBg: "bg-amber-100",
        hoverColor: "hover:bg-amber-50 hover:text-amber-700",
        badge: undefined,
        href: "/users",
        onClick: undefined,
        roles: ['admin'], // Admin only
      },
    ],
  },
]

// Helper function to filter navigation by role
export function getNavigationForRole(role: UserRole | null): NavigationSection[] {
  if (!role) return [];

  return NAVIGATION_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.includes(role))
  })).filter(section => section.items.length > 0);
}