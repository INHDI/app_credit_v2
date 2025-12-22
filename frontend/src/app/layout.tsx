import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { AuthProvider } from "@/providers/AuthContext";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hệ thống quản lý tín dụng",
  description: "Credit Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <WebSocketProvider>
            <AuthenticatedLayout>
              {children}
            </AuthenticatedLayout>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
