import { useState } from 'react';
import Desk from '@/components/desk/Desk';
import Splash, { hasPrivacyConsent } from '@/components/desk/Splash';
import InstallHint from '@/components/desk/InstallHint';

const Index = () => {
  const [ready, setReady] = useState(() => hasPrivacyConsent());
  const skipped = hasPrivacyConsent();

  return (
    <>
      {ready && (
        <div className={skipped ? undefined : 'animate-fade-in'}>
          <Desk />
          <InstallHint />
        </div>
      )}
      {!ready && <Splash onDone={() => setReady(true)} />}
    </>
  );
};

export default Index;