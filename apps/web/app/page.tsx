'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@platform/auth';
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Metrics } from "@/components/Metrics";
import { FeatureGrid } from "@/components/FeatureGrid";
import { IncidentSimulator } from "@/components/IncidentSimulator";
import { ArchitectureShowcase } from "@/components/ArchitectureShowcase";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && sessionData) {
      authClient.organization.list().then((listRes) => {
        const orgs = listRes?.data || [];
        if (orgs.length > 0) {
          const activeOrgId = sessionData.session.activeOrganizationId;
          const activeOrg = orgs.find((o: any) => o.id === activeOrgId);
          if (activeOrg) {
            router.push(`/${activeOrg.slug}`);
          } else {
            const personal = orgs.find((o: any) => o.kind === 'PERSONAL');
            router.push(`/${personal?.slug || orgs[0].slug}`);
          }
        }
      });
    }
  }, [sessionData, isPending]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center text-slate-100">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // Show marketing page only if unauthenticated
  if (sessionData) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center text-slate-100">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Metrics />
        <FeatureGrid />
        <IncidentSimulator />
        <ArchitectureShowcase />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
