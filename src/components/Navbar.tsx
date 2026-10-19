import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import TestoriaxLogo from './ui/TestoriaxLogo';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onNavigate: (view: any) => void;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentView = 'landing' }) => {
  const { session, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Testimonials', href: '#testimonials' },
    { name: 'Pricing', href: '#pricing' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'py-4 bg-white/70 backdrop-blur-md border-b border-lilac-100 shadow-sm shadow-lilac-100/10'
            : 'py-6 bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="group"
          >
            <TestoriaxLogo showText={true} textColor="text-slate-900" lightMode={true} />
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => {
                  if (currentView !== 'landing') {
                    onNavigate('landing');
                  }
                }}
                className="font-medium text-slate-600 hover:text-lilac-600 transition-colors duration-200 text-sm relative group py-2"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-lilac-500 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}

            {/* Discovery Link */}
            <a
              href="#discovery"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('discovery');
              }}
              className={`font-medium transition-colors duration-200 text-sm relative group py-2 ${
                currentView === 'discovery' ? 'text-lilac-600 font-extrabold' : 'text-slate-600 hover:text-lilac-600'
              }`}
            >
              Public Lobby
              <span className={`absolute bottom-0 left-0 h-0.5 bg-lilac-550 transition-all duration-300 ${
                currentView === 'discovery' ? 'w-full' : 'w-0 group-hover:w-full'
              }`} />
            </a>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {session ? (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="font-semibold text-slate-700 hover:text-lilac-600 transition-colors duration-200 text-sm cursor-pointer"
                >
                  Dashboard
                </button>
                <button
                  onClick={async () => {
                    await signOut();
                    onNavigate('landing');
                  }}
                  className="relative inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-lilac-600 to-violet-600 hover:from-lilac-500 hover:to-violet-500 shadow-md shadow-lilac-500/20 hover:shadow-lg hover:shadow-lilac-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 overflow-hidden cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="font-semibold text-slate-700 hover:text-lilac-600 transition-colors duration-200 text-sm cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="relative inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-lilac-600 to-violet-600 hover:from-lilac-500 hover:to-violet-500 shadow-md shadow-lilac-500/20 hover:shadow-lg hover:shadow-lilac-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 overflow-hidden cursor-pointer"
                >
                  Start Free Trial
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-lilac-50 transition-colors focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[72px] z-40 md:hidden p-4 bg-white/95 backdrop-blur-lg border-b border-lilac-100 shadow-lg"
          >
            <div className="flex flex-col gap-4 py-4 px-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (currentView !== 'landing') {
                      onNavigate('landing');
                    }
                  }}
                  className="font-semibold text-lg text-slate-700 hover:text-lilac-600 py-2 border-b border-slate-50 transition-colors"
                >
                  {link.name}
                </a>
              ))}

              <a
                href="#discovery"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  onNavigate('discovery');
                }}
                className="font-semibold text-lg text-slate-750 hover:text-lilac-600 py-2 border-b border-slate-50 transition-colors"
              >
                Public Lobby
              </a>
              <div className="flex flex-col gap-3 pt-4">
                {session ? (
                  <>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('dashboard');
                      }}
                      className="w-full text-center py-3 rounded-xl font-semibold text-slate-700 hover:bg-lilac-50 border border-slate-100 transition-colors cursor-pointer"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={async () => {
                        setIsMobileMenuOpen(false);
                        await signOut();
                        onNavigate('landing');
                      }}
                      className="w-full text-center py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-lilac-600 to-violet-600 shadow-md shadow-lilac-500/20 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('login');
                      }}
                      className="w-full text-center py-3 rounded-xl font-semibold text-slate-700 hover:bg-lilac-50 border border-slate-100 transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('register');
                      }}
                      className="w-full text-center py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-lilac-600 to-violet-600 shadow-md shadow-lilac-500/20 cursor-pointer"
                    >
                      Start Free Trial
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
