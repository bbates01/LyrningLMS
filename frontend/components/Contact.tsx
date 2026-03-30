import React from 'react';
import { COLORS } from '../constants';
import longLogo from '../img/long-logo-removebg-preview.png';

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <header className="sticky top-0 z-50 bg-[#fcfcfc]/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img src={longLogo} alt="Lyrning" className="h-9 sm:h-11 w-auto object-contain" />
          </a>
          <a
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
            style={{ backgroundColor: COLORS.primary }}
          >
            Teacher login
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10 pb-16">
        <div className="bg-white border border-slate-200 rounded-[32px] p-8 sm:p-10 shadow-sm">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Get started</h1>
          <p className="mt-4 text-slate-700 leading-relaxed max-w-3xl">
            Interested in bringing Lyrning to your school or district? Email us to discuss pricing, onboarding, and a
            pilot that fits your classroom needs.
          </p>
          <p className="mt-5 text-slate-700">
            Reach out at{' '}
            <a
              href="mailto:willkn@lyrning.com"
              className="font-semibold underline"
              style={{ color: COLORS.primary }}
            >
              willkn@lyrning.com
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default Contact;

