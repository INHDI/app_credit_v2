import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Đăng nhập - Hệ thống quản lý tín dụng",
    description: "Đăng nhập vào hệ thống quản lý tín dụng",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Login page has its own layout without navigation
    return <>{children}</>;
}
