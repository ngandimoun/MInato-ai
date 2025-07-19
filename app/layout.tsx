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
import { TrialAlertsProvider } from "@/components/subscription/TrialAlertsProvider";
import { WelcomeTrialToast } from "@/components/subscription/WelcomeTrialToast";
import { SubscriptionExpirationToast } from "@/components/subscription/SubscriptionExpirationToast";
import { ProModalManager } from "@/components/ui/pro-modal-manager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Minato AI",
  description: "Your AI-powered companion for productivity and creativity",
  // viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head> */}
      <body className={inter.className} suppressHydrationWarning>
        <MemoryCleanupProvider>
          <ThemeProvider>
            <AuthProvider>
              <NavigationProvider>
                <UploadStatusProvider>
                  <ListeningProvider>
                    <TrialAlertsProvider>
                      {/* ✅ TOASTS GLOBAUX: Disponibles sur toutes les pages */}
                      <WelcomeTrialToast />
                      <SubscriptionExpirationToast />
                      <ProModalManager />
                      {children}
                    </TrialAlertsProvider>
                  </ListeningProvider>
                </UploadStatusProvider>
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