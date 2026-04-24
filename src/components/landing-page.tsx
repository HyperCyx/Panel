import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, BarChart, ShieldCheck, ArrowRight, Code, MessageSquare, DollarSign } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface LandingPageProps {
  siteName: string;
  signupEnabled: boolean;
  footerText: string;
  siteVersion: string;
}

export function LandingPage({ siteName, signupEnabled, footerText, siteVersion }: LandingPageProps) {
  const processedFooterText = footerText
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{SITENAME}', siteName)
    .replace('{VERSION}', siteVersion || '');

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="fixed top-4 left-4 right-4 z-50 glass-panel rounded-full max-w-7xl mx-auto shadow-lg border border-border/50 dark:border-white/10">
        <div className="flex h-16 items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-wide">{siteName}</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
             <ThemeToggle />
             <Link href="/login">
                <Button variant="ghost">Login</Button>
            </Link>
            {signupEnabled && (
                <Link href="/signup">
                    <Button>Sign Up</Button>
                </Link>
            )}
          </nav>
          <div className="flex items-center gap-3 md:hidden">
             <ThemeToggle />
             <Link href="/login">
                <Button variant="outline" size="sm">Login</Button>
            </Link>
            {signupEnabled && (
                <Link href="/signup">
                    <Button size="sm">Sign Up</Button>
                </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="container mx-auto px-4 md:px-6 py-20 md:py-32 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-4xl mx-auto relative z-10">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/60 neon-text-glow leading-tight">
              Monetize Your OTP Traffic with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Global IPRN</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground/80 mb-10 max-w-2xl mx-auto">
              Leverage our robust network of International Premium Rate Numbers to deliver OTPs and generate revenue from every message you send.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
               {signupEnabled && (
                <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto">Start Earning Now</Button>
                </Link>
               )}
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Access Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 relative">
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">Your Partner in SMS Monetization</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
                We provide the platform and network you need to succeed.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="futuristic-card rounded-3xl transform hover:-translate-y-2">
                <CardHeader className="items-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                    <Globe className="h-8 w-8" />
                  </div>
                  <CardTitle>Extensive Global Coverage</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Access a vast inventory of IPRNs across numerous countries and mobile operators for maximum reach and revenue potential.
                </CardContent>
              </Card>
              <Card className="futuristic-card rounded-3xl transform hover:-translate-y-2">
                <CardHeader className="items-center">
                    <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                        <BarChart className="h-8 w-8" />
                    </div>
                  <CardTitle>Real-Time Analytics</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Monitor your traffic, track delivery rates, and view your earnings with our powerful and intuitive dashboard.
                </CardContent>
              </Card>
              <Card className="futuristic-card rounded-3xl transform hover:-translate-y-2">
                <CardHeader className="items-center">
                    <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                  <CardTitle>Secure & Reliable Delivery</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Our platform is built for high-throughput, secure OTP delivery, ensuring your messages reach their destination reliably.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 md:py-24 relative">
            <div className="absolute right-0 top-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">Start Earning in 3 Simple Steps</h2>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
                        Our straightforward process gets you up and running in no time.
                    </p>
                </div>
                <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center futuristic-card rounded-3xl p-8">
                        <div className="p-5 rounded-2xl bg-primary/20 text-primary mb-6 neon-glow border border-primary/30">
                            <Code className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">1. Integrate</h3>
                        <p className="text-muted-foreground">
                            Easily integrate with your existing systems using our simple and well-documented API.
                        </p>
                    </div>
                    <div className="flex flex-col items-center futuristic-card rounded-3xl p-8">
                        <div className="p-5 rounded-2xl bg-primary/20 text-primary mb-6 neon-glow border border-primary/30">
                            <MessageSquare className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">2. Send Traffic</h3>
                        <p className="text-muted-foreground">
                            Route your A2P and P2P OTP SMS traffic through our secure global IPRN network.
                        </p>
                    </div>
                    <div className="flex flex-col items-center futuristic-card rounded-3xl p-8">
                        <div className="p-5 rounded-2xl bg-primary/20 text-primary mb-6 neon-glow border border-primary/30">
                            <DollarSign className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">3. Earn Revenue</h3>
                        <p className="text-muted-foreground">
                            Get paid for every successfully delivered message. Watch your revenue grow on your dashboard.
                        </p>
                    </div>
                </div>
            </div>
        </section>

      </main>

      <footer className="relative mt-12 mb-4 mx-4 glass-panel rounded-2xl max-w-7xl lg:mx-auto">
        <div className="container mx-auto px-4 md:px-6 py-6 text-center text-muted-foreground text-sm">
          {processedFooterText}
          {siteVersion && (
            <span className="ml-2 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
              v{siteVersion}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
