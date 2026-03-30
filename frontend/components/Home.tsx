import React from 'react';
import { COLORS } from '../constants';
import longLogo from '../img/long-logo-removebg-preview.png';

const Home: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <header className="sticky top-0 z-50 bg-[#fcfcfc]/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img src={longLogo} alt="Lyrning" className="h-9 sm:h-11 w-auto object-contain" />
          </a>
          <a
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition whitespace-nowrap"
            style={{ backgroundColor: COLORS.primary }}
          >
            Teacher login
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-10 pb-16 space-y-16">
        {/* 1) Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Built for teachers</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Students are using AI to skip the thinking.
              <span className="block">You can’t see it happening.</span>
            </h1>
            <p className="mt-5 text-slate-700 leading-relaxed max-w-xl">
              Lyrning turns AI from a shortcut into a guided learning tool — and gives you clear visibility into student
              independence. Create assignments from your materials, constrain the AI tutor, and track
              <span className="font-semibold"> AI Dependency going down</span> week by week.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a
                href="/login"
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-sm font-bold text-white shadow hover:opacity-90 transition"
                style={{ backgroundColor: COLORS.primary }}
              >
                Get Started
              </a>
              <button
                type="button"
                onClick={() => scrollTo('how-it-works')}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-sm font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 transition"
              >
                See How It Works
              </button>
            </div>
            <div className="mt-5">
              <a href="/admin" className="text-sm font-semibold underline" style={{ color: COLORS.primary }}>
                Administrator login
              </a>
            </div>
          </div>
        </section>

        {/* 2) The Problem (teacher scenarios) */}
        <section id="problem" className="bg-white border border-slate-200 rounded-[32px] p-8 sm:p-10 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Teach with AI — without losing sight of learning.
          </h2>
          <p className="mt-4 text-slate-700 leading-relaxed max-w-3xl">
            You’re trying to help students build real skills. But with AI in the mix, the final answer often hides the
            learning process — and it’s hard to know who needs support until it’s too late.
          </p>
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">A strong submission, weak explanation</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                You want to coach the student — but you don’t know if they understand it, or if AI carried the thinking.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">A high score can hide dependency</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                Grades show performance — not whether the student worked independently or leaned on AI the whole time.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Support arrives late</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                By the time the gap shows up, you’ve lost weeks of chances to intervene, reteach, and build confidence.
              </p>
            </div>
          </div>
          <p className="mt-6 text-slate-700 leading-relaxed max-w-3xl">
            Lyrning gives you visibility during the work so you can respond like a teacher: encourage, redirect, and help
            students become more independent over time.
          </p>
        </section>

        {/* 3) How it works */}
        <section id="how-it-works" className="space-y-4 scroll-mt-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How Lyrning works</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              A teacher-first workflow, step by step
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm">
              <ol className="space-y-5 text-sm text-slate-700">
                <li>
                  <p className="font-semibold text-slate-900">1) Upload your PDF or document</p>
                  <p className="mt-1">Use the material you already teach — notes, readings, slides, or a worksheet.</p>
                </li>
                <li>
                  <p className="font-semibold text-slate-900">2) AI generates questions (you review first)</p>
                  <p className="mt-1">You can edit, remove, or rewrite before students see anything.</p>
                </li>
                <li>
                  <p className="font-semibold text-slate-900">3) Students complete the assignment with an AI tutor</p>
                  <p className="mt-1">
                    The tutor follows your rules. It guides with hints and questions — it doesn’t just hand out answers.
                  </p>
                </li>
              </ol>
            </div>

            <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm">
              <ol className="space-y-5 text-sm text-slate-700">
                <li>
                  <p className="font-semibold text-slate-900">4) Submission triggers analysis</p>
                  <p className="mt-1">
                    Lyrning analyzes performance and the AI chat session to score how independently the student worked.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-slate-900">5) Get an AI Dependency Score (0–100)</p>
                  <p className="mt-1">
                    <span className="font-semibold">0</span> = fully independent. <span className="font-semibold">100</span>{' '}
                    = fully dependent. You also get weekly <span className="font-semibold">Accuracy</span> and{' '}
                    <span className="font-semibold">Understanding</span> so you can tell “high score” from “real mastery.”
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-slate-900">6) See weekly trends per student</p>
                  <p className="mt-1">Track Accuracy, AI Dependency, and Understanding over time.</p>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* 4) Metrics explained */}
        <section id="metrics" className="bg-white border border-slate-200 rounded-[32px] p-8 sm:p-10 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            The three metrics you’ll actually use
          </h2>
          <p className="mt-3 text-slate-700 leading-relaxed max-w-3xl">
            Scores are designed to be simple to interpret and actionable: who needs support, who needs challenge, and
            who needs guardrails.
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Accuracy</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                The student’s average assignment score for the week. Useful for spotting performance changes quickly.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">AI Dependency (0–100)</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                How much the student leaned on the AI during their session — scored after submission using the entire
                chat. <span className="font-semibold">0</span> = independent, <span className="font-semibold">100</span>{' '}
                = dependent.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Understanding</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                A combined score that rewards students who perform well <span className="font-semibold">and</span> did
                it themselves. Helps distinguish “high score” from “real mastery.”
              </p>
            </div>
          </div>
        </section>

        {/* 5) Why it matters */}
        <section id="why" className="bg-white border border-slate-200 rounded-[32px] p-8 sm:p-10 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Why it matters</h2>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Intervene earlier</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                Catch over-reliance before it becomes a semester-long gap.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Build real skills</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                Students get support while still doing the thinking that grows understanding.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">AI becomes a tool</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                Guardrails keep AI helpful — not a crutch.
              </p>
            </div>
          </div>
        </section>

        {/* 6) CTA / Pricing */}
        <section id="cta" className="bg-slate-900 rounded-[32px] p-8 sm:p-10 text-white">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Bring Lyrning to your school</h2>
          <p className="mt-3 text-slate-200 max-w-2xl leading-relaxed">
            Start with a class, a department, or a pilot. We’ll help you set it up so teachers get visibility fast.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl text-sm font-bold text-white shadow hover:opacity-90 transition"
              style={{ backgroundColor: COLORS.primary }}
            >
              Get Started
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;

