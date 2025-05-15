// FILE: app/layout.tsx
// (Content from finalcodebase.txt - verified)
import type { Metadata, Viewport } from "next"; 
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/settings/theme-context";
import { AuthProvider } from "@/context/auth-provider";
import { UploadStatusProvider } from "@/context/upload-status-context";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css"; // Ensure Tailwind/global styles are imported

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Minato AI",
  description: "Your AI Companion",
  // Add PWA related meta tags
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Minato AI",
    // startupImage: '/splash.png', // Optional splash screen
  },
};

export const viewport: Viewport = { // <-- AJOUTER CECI
  themeColor: "#101010",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}> {/* Add antialiased for smoother fonts */}
        <AuthProvider>
          <ThemeProvider>
            <UploadStatusProvider>
              {children}
              <Toaster />
            </UploadStatusProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}