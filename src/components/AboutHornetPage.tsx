import React from 'react';
import { User, Shield, ArrowLeft, Mail, Heart, ExternalLink, Bug } from 'lucide-react';

interface AboutHornetPageProps {
  onBackToArchive?: () => void;
}

export const AboutHornetPage: React.FC<AboutHornetPageProps> = ({ onBackToArchive }) => {
  return (
    <div className="max-w-4xl mx-auto px-2 py-4 space-y-6 animate-fade-in font-mono">
      {/* Header Banner */}
      <div className="bg-slate-900 p-5 sm:p-7 rounded-xl border border-slate-800 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-bold uppercase tracking-wider border border-slate-700">
            <User size={12} /> Profile
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight font-mono">
            ABOUT ANCIENT HORNET
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans max-w-2xl">
            A personal note from the creator and maintainer of Medium Archive.
          </p>

          {onBackToArchive && (
            <button
              onClick={onBackToArchive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition shadow-md mt-1 cursor-pointer"
            >
              <ArrowLeft size={13} /> Return to Archive
            </button>
          )}
        </div>
      </div>

      {/* Main Narrative Card */}
      <div className="bg-[#0e1117] border border-slate-800/90 p-5 sm:p-8 rounded-2xl shadow-xl space-y-6 font-sans text-slate-200 leading-relaxed text-sm sm:text-base">
        
        {/* Intro Header */}
        <div className="border-b border-slate-800/80 pb-4">
          <h2 className="text-lg font-bold text-slate-100 font-mono">Ancient Hornet</h2>
          <p className="text-xs text-amber-400/90 font-mono">Born in 2005 • Book Translator & Media Collector</p>
        </div>

        {/* Narrative Text */}
        <div className="space-y-4 text-slate-300">
          <p>
            Hello, I'm Hornet. I was born in 2005. I earn my living by translating books across 3 different languages and reselling secondhand products. I have been obsessive about media, literature, and cinema since I was 8 years old.
          </p>

          <p>
            I built this archive as a personal project to catalog, organize, and analyze every piece of media I consume — from books and films to visual arts, games, and music.
          </p>

          <div className="bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 sm:p-5 space-y-2 text-slate-200">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
              <Shield size={14} /> Independent Personal Archive
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every review, score breakdown, tag categorization, and analytical take in this database is handwritten and curated by me. Thanks to my background as a translator, I aim to keep my notes thoughtful, structured, and detailed.
            </p>
          </div>

          <p>
            I hope my observations and takes on media are interesting and useful to fellow enthusiasts!
          </p>
        </div>

        {/* Donation & Support Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-wider">
            <Heart size={15} className="fill-rose-400/20" /> Support The Archive
          </div>
          <p className="text-slate-200 font-sans text-sm italic leading-relaxed">
            "This site doesn't use ads so support by donating so I can keep doing what I love and actually pay my rent lol."
          </p>
          <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-rose-500/20 pt-3">
            <a
              href="https://kreosus.com/ancienthornet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline truncate font-bold text-xs"
            >
              https://kreosus.com/ancienthornet
            </a>
            <a
              href="https://kreosus.com/ancienthornet"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-md"
            >
              <span>Donate on Kreosus</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Action Grid: Contact & Report a Bug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Contact Mail Box */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                <Mail size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] uppercase block font-bold">Contact & Inquiries</span>
                <a href="mailto:fourward996@gmail.com" className="text-amber-300 font-bold hover:underline truncate block">
                  fourward996@gmail.com
                </a>
              </div>
            </div>
            <a
              href="mailto:fourward996@gmail.com"
              className="w-full text-center px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs transition"
            >
              Send Email →
            </a>
          </div>

          {/* Report a Bug Button & Box */}
          <div className="bg-slate-950/90 border border-rose-900/40 rounded-xl p-4 flex flex-col justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 shrink-0">
                <Bug size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-rose-400 text-[10px] uppercase block font-bold">Found an Issue?</span>
                <span className="text-slate-300 font-bold truncate block">
                  Report a Bug to Hornet
                </span>
              </div>
            </div>
            <a
              href="mailto:fourward996@gmail.com?subject=Medium%20Archive%20Bug%20Report&body=Describe%20the%20bug%20or%20issue%20you%20encountered:%0A%0A"
              className="w-full text-center px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 border border-rose-700/60 text-rose-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Bug size={13} />
              <span>Report a Bug</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
