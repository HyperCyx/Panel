import { SignupForm } from '@/components/signup-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { getPublicSettings, getSignupStatus } from '@/app/actions';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions';

export default async function SignupPage() {
    // Check if user is already logged in
    const user = await getCurrentUser();
    if (user) {
        redirect('/dashboard');
    }

    const [{ siteName, footerText }, { signupEnabled }] = await Promise.all([
        getPublicSettings(),
        getSignupStatus(),
    ]);

    if (!signupEnabled) {
        redirect('/login');
    }

    const processedFooter = (footerText || '')
        .replace('{YEAR}', new Date().getFullYear().toString())
        .replace('{SITENAME}', siteName);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/"><h2 className="text-2xl font-bold mb-2">{siteName}</h2></Link>
          <CardTitle className="text-xl font-semibold">Create an Account</CardTitle>
          <CardDescription>Enter your details below to create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline font-medium text-primary">
              Login
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
