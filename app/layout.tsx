// FILE: app/layout.tsx
// (Content from finalcodebase.txt - verified)
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./themes.css";
import { AuthProvider } from "@/context/auth-provider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { UploadStatusProvider } from "@/context/upload-status-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Minato AI",
  description: "Your AI-powered companion for productivity and creativity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <UploadStatusProvider>
              {children}
            </UploadStatusProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}