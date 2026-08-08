'use client';

import { useEffect } from 'react';
import { authClient } from '@platform/auth';
import { useRouter } from 'next/navigation';

export default function RootIndexPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending) {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-primary animate-pulse font-medium text-lg">Routing session...</div>
    </div>
  );
}
