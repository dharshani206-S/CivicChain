import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
import IssueCard from "@/components/IssueCard";
import SEO from "@/components/SEO";
import type { Issue } from "@/types/issue";
import { toIssueArray } from "@/utils/api";
import {
  Shield,
  FileText,
  Sparkles,
  Users,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

const Landing = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    issuesAPI
      .getAll()
      .then((res) => {
        const data: unknown = res.data;
        setIssues(toIssueArray(data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Sort and slice latest 3 issues
  const latestIssues = useMemo(() => {
    return [...issues]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [issues]);

  const landingStructuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://civic-chain-tau.vercel.app/#app",
        "name": "CivicChain",
        "url": "https://civic-chain-tau.vercel.app",
        "applicationCategory": "GovernmentApplication",
        "operatingSystem": "Web Browser",
        "description": "AI-Powered Civic Incident Dispatch & Smart City Platform for Puducherry.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://civic-chain-tau.vercel.app/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is CivicChain?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CivicChain is an AI-powered smart city incident dispatch and civic issue reporting platform for Puducherry, connecting citizens directly with municipal departments."
            }
          },
          {
            "@type": "Question",
            "name": "How does civic issue reporting work in CivicChain?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Citizens can lodge geotagged reports with photos. Dual-tier AI (on-device TensorFlow.js and Google Gemini) classifies the issue, routes it to the correct department, and allows citizens to track resolution timelines in real-time."
            }
          }
        ]
      }
    ]
  }), []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans">
      <SEO
        title="CivicChain | AI-Powered Civic Issue Reporting for Puducherry"
        description="CivicChain connects Puducherry citizens directly with municipal departments. Lodge geotagged civic reports with AI vision classification and track real-time resolution."
        canonicalUrl="https://civic-chain-tau.vercel.app"
        ogType="website"
        ogImage="/hero-bg.jpg"
        ogImageAlt="CivicChain AI Smart City Infrastructure in Puducherry"
        structuredData={landingStructuredData}
        keywords={[
          "CivicChain Puducherry",
          "Pondicherry civic reporting",
          "AI smart city platform",
          "municipal complaint Puducherry",
          "pothole report Pondicherry",
          "sanitation issue tracker Puducherry"
        ]}
      />

      <Navbar />

      <main>
        {/* 1. HERO SECTION WITH IMAGE BACKGROUND AND BRAND OVERLAY */}
        <section aria-label="CivicChain Hero Section" className="relative overflow-hidden py-28 sm:py-36 text-white bg-zinc-950">
          {/* Background Image */}
          <img
            src="/hero-bg.jpg"
            alt="Civic infrastructure and smart city operations in Puducherry"
            className="absolute inset-0 h-full w-full object-cover opacity-40 select-none pointer-events-none"
            loading="eager"
            decoding="async"
          />
          {/* Brand HSL Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/75 via-primary/45 to-secondary/70 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 text-center space-y-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 backdrop-blur-md"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-semibold tracking-wide">Empowering Smart City Infrastructure</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto max-w-4xl text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight"
            >
              Report. Track. <br />
              Resolve. Together.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto max-w-2xl text-base sm:text-lg text-white/80 leading-relaxed font-sans"
            >
              Connecting citizens directly with municipal operations. Lodge geotagged reports with on-device AI routing, track progress in real-time, and build a stronger neighborhood.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link
                to="/report"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-zinc-900 shadow-md hover:bg-zinc-100 hover:scale-[1.01] transition-all"
              >
                Lodge Issue Report
              </Link>
              <Link
                to="/issues"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-white/30 bg-transparent px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10 hover:border-white transition-all"
              >
                Browse Public Feed
              </Link>
            </motion.div>
          </div>
        </section>

        {/* 2. LATEST REPORTED ISSUES (PUBLIC FEED) */}
        <section aria-labelledby="latest-issues-heading" className="py-20 bg-white border-b border-zinc-200">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 space-y-12">
            <header className="text-center max-w-3xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Public Feed</span>
              <h2 id="latest-issues-heading" className="text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                Latest Reported Issues
              </h2>
              <p className="text-sm text-zinc-500 font-sans">Recent municipal tickets submitted by community members.</p>
            </header>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="h-[360px] rounded-xl border border-zinc-200 bg-zinc-50/50 animate-pulse" />
                ))}
              </div>
            ) : latestIssues.length > 0 ? (
              <div className="space-y-10">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {latestIssues.map((issue) => (
                    <IssueCard key={issue._id} issue={issue} />
                  ))}
                </div>

                <div className="text-center pt-2">
                  <Link
                    to="/issues"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2.5 px-6 text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors"
                  >
                    View All Directory Issues <ArrowRight className="h-4 w-4 text-zinc-400" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-16 text-center text-xs text-zinc-400 font-mono shadow-inner">
                No reported issues in the feed.
              </div>
            )}
          </div>
        </section>

        {/* 3. ABOUT CIVICCHAIN */}
        <section id="about" aria-labelledby="about-heading" className="py-20 bg-[#fafafa] scroll-mt-12">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 space-y-12">
            <header className="text-center max-w-3xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">About CivicChain</span>
              <h2 id="about-heading" className="text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                Unified Operations Infrastructure
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed font-sans">
                CivicChain is designed to optimize community maintenance using local machine learning routing, secure coordinates validation, and departmental locking.
              </p>
            </header>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Department Isolation",
                  desc: "Tickets are strictly locked to respective department endpoints on the backend database level. Officers see and modify only their queue.",
                  color: "bg-primary/10 text-primary border-primary/20"
                },
                {
                  icon: FileText,
                  title: "Dynamic Timeline Tracking",
                  desc: "Track complaints from lodging, route dispatch, inspector audit, to final resolution with auditable, timestamped progress pipelines.",
                  color: "bg-secondary/10 text-secondary border-secondary/20"
                },
                {
                  icon: Users,
                  title: "Community Backing",
                  desc: "Upvote neighborhood priorities. Urgent safety or utility outages bubble up to dispatchers via community vote weights.",
                  color: "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }
              ].map((f, idx) => {
                const IconComp = f.icon;
                return (
                  <article key={idx} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4 hover:border-zinc-300 transition-colors">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg border ${f.color}`}>
                      <IconComp className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-950">{f.title}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* 4. FOOTER */}
      <footer aria-label="CivicChain Footer" className="bg-zinc-950 border-t border-zinc-800 py-8 text-zinc-500">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p>&copy; 2025 CivicChain | A Student Hackathon Project Leveraging AI for Smarter Civic Solutions</p>
          <p className="font-mono">Community. Trust. Consensus.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
