import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistem Pendataan & Pembukuan - Kelola Bahan Baku, Menu, dan Transaksi",
  description: "Sistem pendataan dan pembukuan sederhana untuk mengelola bahan baku, menu, dan transaksi penjualan dengan fitur laporan PDF.",
  keywords: ["Pendataan", "Pembukuan", "Bahan Baku", "Menu", "Transaksi", "Laporan", "Next.js", "TypeScript"],
  authors: [{ name: "Z.ai Team" }],
  // icons: {
  //   icon: "",
  // },
  openGraph: {
    title: "Sistem Pendataan & Pembukuan",
    description: "Sistem pendataan dan pembukuan untuk usaha Anda",
    url: "https://chat.z.ai",
    siteName: "Sistem Pembukuan",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistem Pendataan & Pembukuan",
    description: "Kelola usaha Anda dengan mudah",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
