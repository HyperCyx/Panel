import { LandingPage } from '@/components/landing-page';
import { getPublicSettings, getSignupStatus } from '@/app/actions';

export default async function Home() {
  const [{ siteName, footerText, siteVersion }, { signupEnabled }] = await Promise.all([
    getPublicSettings(),
    getSignupStatus()
  ]);
  
  return <LandingPage siteName={siteName} signupEnabled={signupEnabled} footerText={footerText} siteVersion={siteVersion} />;
}
