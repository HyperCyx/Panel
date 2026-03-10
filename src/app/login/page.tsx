import { LoginForm } from '@/components/login-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { getPublicSettings } from '@/app/actions';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions';

export default async function LoginPage() {
    // Check if user is already logged in
    const user = await getCurrentUser();
    if (user) {
        redirect('/dashboard');
    }

    const { siteName, footerText } = await getPublicSettings();
    const processedFooter = (footerText || '')
        .replace('{YEAR}', new Date().getFullYear().toString())
        .replace('{SITENAME}', siteName);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/"><h2 className="text-2xl font-bold mb-2">{siteName}</h2></Link>
          <CardTitle className="text-xl font-semibold">Welcome Back</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline font-medium text-primary">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      {processedFooter && (
        <div className="mt-8 text-center text-xs text-muted-foreground">{processedFooter}</div>
      )}
    </main>
  );
}
