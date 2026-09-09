import { useState } from 'react';
import Desk from '@/components/desk/Desk';
import Splash, { hasPrivacyConsent } from '@/components/desk/Splash';

const Index = () => {
  const [ready, setReady] = useState(() => hasPrivacyConsent());

  if (!ready) return <Splash onDone={() => setReady(true)} />;
  return <Desk />;
};

export default Index;
