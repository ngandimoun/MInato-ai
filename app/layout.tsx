// FILE: app/layout.tsx
// (Content from finalcodebase.txt - verified)
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-provider";
import { ThemeProvider } from "@/components/settings/theme-context";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { UploadStatusProvider } from "@/context/upload-status-context";
import { ListeningProvider } from "@/context/listening-context";
import { NavigationProvider } from "@/context/navigation-context";
import { MemoryCleanupProvider } from "@/components/memory-cleanup-provider";
import { PlanStatusFloating } from '@/components/subscription/plan-status-floating'

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
      <body className={inter.className} suppressHydrationWarning>
        <MemoryCleanupProvider>
          <ThemeProvider>
            <AuthProvider>
              <NavigationProvider>
                <UploadStatusProvider>
                  <ListeningProvider>
                    {children}
                  </ListeningProvider>
                </UploadStatusProvider>
                <PlanStatusFloating />
              </NavigationProvider>
            </AuthProvider>
            <Toaster />
            <SonnerToaster position="top-right" />
          </ThemeProvider>
        </MemoryCleanupProvider>
      </body>
    </html>
  );
}