import React from 'react';
import { ArrowRight } from 'lucide-react';
import TestoriaxLogo from './ui/TestoriaxLogo';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '#features' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Security Lobbies', href: '#' },
        { name: 'Product Roadmap', href: '#' },
        { name: 'Changelog', href: '#' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'API Reference', href: '#' },
        { name: 'Developer Guide', href: '#' },
        { name: 'Documentation', href: '#' },
        { name: 'Uptime Monitor', href: '#' },
        { name: 'Help Center', href: '#' }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '#' },
        { name: 'Careers', href: '#' },
        { name: 'Press Kit', href: '#' },
        { name: 'Contact Sales', href: '#' },
        { name: 'Partnerships', href: '#' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '#' },
        { name: 'Terms of Service', href: '#' },
        { name: 'Security Policy', href: '#' },
        { name: 'DPA & GDPR Compliance', href: '#' },
        { name: 'Trust Center', href: '#' }
      ]
    }
  ];

  return (
    <footer className="bg-gradient-to-b from-lilac-100/25 to-lilac-100/40 border-t border-lilac-200/50 pt-16 pb-8 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Brand & Slogan */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <a href="#" className="group self-start">
              <TestoriaxLogo showText={true} textColor="text-slate-900" lightMode={true} />
            </a>
            
            <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
              Empowering educators, enterprises, and engineering teams to orchestrate high-integrity assessments, dynamic quiz lobbies, and metrics-driven study patterns.
            </p>

            {/* Socials */}
            <div className="flex gap-4.5 text-slate-400">
              <a href="#" className="hover:text-lilac-600 transition-colors" aria-label="Twitter">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" className="hover:text-lilac-600 transition-colors" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
              <a href="#" className="hover:text-lilac-600 transition-colors" aria-label="GitHub">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/></svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {footerLinks.map((col, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                <h4 className="font-display font-bold text-slate-900 text-xs tracking-wider uppercase">
                  {col.title}
                </h4>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <a
                        href={link.href}
                        className="text-slate-500 hover:text-lilac-600 transition-colors text-xs"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter Column */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <h4 className="font-display font-bold text-slate-900 text-xs tracking-wider uppercase">
              Subscribe to Newsletter
            </h4>
            <p className="text-slate-500 text-xs leading-relaxed">
              Get the latest product releases, proctoring guides, and optimization blueprints sent directly to your inbox.
            </p>
            
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm"
            >
              <input
                type="email"
                placeholder="you@email.com"
                required
                className="flex-grow bg-transparent text-slate-700 placeholder-slate-400 px-3 py-2 text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-lilac-600 to-indigo-600 hover:from-lilac-500 hover:to-indigo-500 text-white p-2 rounded-lg transition-all"
                aria-label="Subscribe"
              >
                <ArrowRight size={14} />
              </button>
            </form>
          </div>

        </div>

        {/* Divider */}
        <div className="w-full h-px bg-slate-200 mb-8" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
          <span>&copy; {currentYear} Testoriax Inc. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-600 transition-colors">SLA</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
