import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';
import { getPublicSettings } from './actions';
import { SettingsProvider } from '@/contexts/settings-provider';
import { allColorKeys } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return {
    title: settings.siteName,
    description: `Inspect and analyze SMS data on ${settings.siteName}`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getPublicSettings();
  
  const generateThemeStyles = () => {
    let styles = ':root {';
    for (const key of allColorKeys) {
        const cssVarName = '--' + key.slice(5).replace(/([A-Z])/g, '-$1').slice(1).toLowerCase();
        if (settings[key]) {
            styles += `${cssVarName}: ${settings[key]};`;
        }
    }
    styles += '}';
    return styles;
  }

  return (
    <html lang="en" suppressHydrationWarning>
       <head>
          <style dangerouslySetInnerHTML={{ __html: generateThemeStyles() }} />
      </head>
      <body className="antialiased">
        <SettingsProvider value={{ siteName: settings.siteName, siteVersion: settings.siteVersion || '3.0.1', footerText: settings.footerText || '', currency: settings.currency || '৳' }}>
            <AuthProvider>
            {children}
            </AuthProvider>
        </SettingsProvider>
        <Toaster />
      </body>
    </html>
  );
}
