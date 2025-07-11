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
        <ThemeProvider>
          <AuthProvider>
            <NavigationProvider>
              <UploadStatusProvider>
                <ListeningProvider>
                  {children}
                </ListeningProvider>
              </UploadStatusProvider>
            </NavigationProvider>
          </AuthProvider>
          <Toaster />
          <SonnerToaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}