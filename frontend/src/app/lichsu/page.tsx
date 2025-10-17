import type { Metadata } from "next";
import LichSu from "./LichSu";

export const metadata: Metadata = {
  title: "Lịch sử - Conan",
  description: "Thống kê và chi tiết lịch sử trả lãi - Conan",
};

export default function LichSuPage() {
  return <LichSu />;
}
