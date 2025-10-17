import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "Bảng điều khiển - Conan",
  description: "Tổng quan hoạt động kinh doanh và thống kê tài chính - Conan",
};

export default function DashboardPage() {
  return (
    <Dashboard />
  );
}


