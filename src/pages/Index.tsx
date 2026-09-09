import { useState } from 'react';
import Desk from '@/components/desk/Desk';
import Splash from '@/components/desk/Splash';

const Index = () => {
  const [ready, setReady] = useState(false);

  return (
    <>
      {ready && (
        <div className="animate-fade-in">
          <Desk />
        </div>
      )}
      {!ready && <Splash onDone={() => setReady(true)} />}
    </>
  );
};

export default Index;