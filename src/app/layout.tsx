import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/AuthContext';
<<<<<<< HEAD
=======
import TopLoaderWrapper from '@/components/top-loader';
>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'HubQueue',
  description: 'Your image processing queue hub.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
<<<<<<< HEAD
=======
            <TopLoaderWrapper />
>>>>>>> c1b8b04 (Revert "使该项目符合 ClassIsland Hub 规范（逃）")
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
