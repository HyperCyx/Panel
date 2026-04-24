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
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <Card className="futuristic-card w-full max-w-md rounded-[2rem] p-2 sm:p-4 relative z-10 border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <Link href="/"><h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-wide">{siteName}</h2></Link>
          <CardTitle className="text-xl font-semibold mt-2">Create an Account</CardTitle>
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
