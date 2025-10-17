import { Metadata } from "next";
import Dashboard from "./dashboard/page";

export const metadata: Metadata = {
  title: "Bảng điều khiển - Conan",
  description: "Tổng quan hoạt động kinh doanh và thống kê tài chính - Conan",
};

export default function HomePage() {
  return (
    <Dashboard />
  );
}
