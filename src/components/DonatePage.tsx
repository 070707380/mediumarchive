import React, { useState } from 'react';
import { Heart, ExternalLink, ArrowLeft, Copy, Check, ShieldCheck, Coffee } from 'lucide-react';

interface DonatePageProps {
  onBackToArchive?: () => void;
}

export const DonatePage: React.FC<DonatePageProps> = ({ onBackToArchive }) => {
  const [copied, setCopied] = useState(false);
  const donateUrl = 'https://kreosus.com/ancienthornet';

  const handleCopy = () => {
    navigator.clipboard.writeText(donateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-3 py-6 space-y-6 font-mono">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Heart size={18} className="text-rose-400 fill-rose-400/20" />
          <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
            Donate & Support
          </h1>
        </div>

        {onBackToArchive && (
          <button
            onClick={onBackToArchive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs transition cursor-pointer"
          >
            <ArrowLeft size={13} /> Back to Archive
          </button>
        )}
      </div>

      {/* Main Donation Container */}
      <div className="bg-[#0e1117] border border-slate-800 p-6 sm:p-8 rounded-xl space-y-6">
        
        {/* Simple Note Box */}
        <div className="p-5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <p className="text-base sm:text-lg font-sans text-slate-200 leading-relaxed italic">
            "This site doesn't use ads so support by donating so I can keep doing what I love and actually pay my rent lol."
          </p>
          <div className="text-xs text-slate-400 font-mono">
            — Ancient Hornet
          </div>
        </div>

        {/* Kreosus Action */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={donateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Heart size={16} className="fill-white/20" />
              <span>Donate on Kreosus</span>
              <ExternalLink size={15} />
            </a>

            <button
              onClick={handleCopy}
              className="px-4 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              title="Copy link to clipboard"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Page Link</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-400 flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-slate-500 text-[11px] shrink-0">Direct Link:</span>
            <a
              href={donateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline truncate font-bold"
            >
              {donateUrl}
            </a>
          </div>
        </div>

        {/* Simple Information Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <ShieldCheck size={14} /> Ad-Free
            </div>
            <p className="text-xs text-slate-400 font-sans">
              No ads, popups, or tracking scripts are used on this site.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
              <Coffee size={14} /> Support Archive Work
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Directly supports media reviews, translations, and cataloging.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
