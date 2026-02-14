
import React from 'react';
import { Icons, COLORS } from '../constants';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-12 py-6 bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg">
            <Icons.ASTULogo className="w-16 h-16 rounded-lg object-cover" />
          </div>
          <div className="flex items-baseline font-serif font-extrabold tracking-tight">
            <span className="text-5xl text-[#17A2B8]">ዘ</span>
            <span className="text-4xl text-[#17A2B8]">ብ</span>
            <span className="text-4xl text-[#0F2A3D] ml-2">AI</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8 font-medium font-bold text-[#0F2A3D]">
          <a href="#" className="hover:text-[#17A2B8] transition-colors">Home</a>
          <button onClick={scrollToHowItWorks} className="hover:text-[#17A2B8] transition-colors">How It Works</button>
          <a href="mailto:security@astu.edu.et" className="hover:text-[#17A2B8] transition-colors">Contact</a>
          <button
            onClick={onGetStarted}
            className="bg-[#17A2B8] text-white px-6 py-2 rounded-lg hover:opacity-90 transition-all font-semibold shadow-md"
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#17A2B8] to-[#17A2B8]/10 py-24 px-12 overflow-hidden">
        {/* Background Image with Mask (Right focused, left faded) */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: 'url(/bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            maskImage: 'linear-gradient(to right, transparent 0%, black 80%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80%)'
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8 text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-extrabold text-[#0F2A3D] leading-tight">
              Your Safety <br />
              <span className="text-white">Your Campus</span> <br />
              Your Voice
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={onGetStarted}
                className="bg-[#17A2B8] text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl hover:-translate-y-1 transition-all"
              >
                Login to Report an Issue
              </button>
              <button
                onClick={scrollToHowItWorks}
                className="bg-white/20 border border-white/40 text-[#0F2A3D] px-8 py-4 rounded-xl text-lg font-bold backdrop-blur-sm hover:bg-white/30 transition-all"
              >
                Learn How It Works
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-12 bg-[#F4F8FA]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold text-[#0F2A3D]">How It Works</h2>
            <div className="w-20 h-1 bg-[#17A2B8] mx-auto"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Authenticate",
                desc: "Securely log in with your verified University Student ID and credentials.",
                icon: Icons.User
              },
              {
                title: "Ask",
                desc: "Ask our AI assistant for policy information.",
                icon: Icons.Shield
              },
              {
                title: "Track Resolution",
                desc: "Monitor the status of your submissions in real-time as they are handled by authorities.",
                icon: Icons.Bell
              },
            ].map((step, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4 hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-[#17A2B8]/10 text-[#17A2B8] rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon />
                </div>
                <h3 className="text-xl font-bold text-[#0F2A3D]">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F2A3D] text-white py-16 px-12 mt-auto">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Icons.Shield />
              <span className="font-bold text-2xl font-serif">ዘብ AI</span>
            </div>
            <p className="text-gray-400 text-sm">
              Securing the future of Adama Science and Technology University through digital innovation.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold">Contact Points</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>Security Office: Block 301, G01</li>
              <li>Maintenance: Block 302</li>
              <li>Emergency: +251 924 62 14 07</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold">Legal</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li><button className="hover:text-white">Privacy Policy</button></li>
              <li><button className="hover:text-white">Terms of Service</button></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold">Institutional</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li><a href="https://www.astu.edu.et" target="_blank" className="hover:text-white"> ASTU Website</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
