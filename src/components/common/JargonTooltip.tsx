import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { META_ADS_GLOSSARY } from '../../utils/jargonGlossary';

interface JargonTooltipProps {
  termKey: string;
  className?: string;
}

export const JargonTooltip: React.FC<JargonTooltipProps> = ({ termKey, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const info = META_ADS_GLOSSARY[termKey];

  if (!info) return null;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
        title={`Penjelasan istilah: ${info.shortName}`}
        aria-label={`Penjelasan istilah: ${info.shortName}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute z-40 left-0 sm:left-auto sm:right-0 mt-2 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
              <span className="font-semibold text-sky-400">{info.term}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-slate-200 leading-relaxed mb-2.5">{info.simpleExplanation}</p>
            <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[11px]">
              <div className="text-emerald-400">
                <span className="font-semibold text-slate-400">Target Ideal:</span> {info.idealRange}
              </div>
              <div className="text-rose-400">
                <span className="font-semibold text-slate-400">Tanda Bahaya:</span> {info.warningSign}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
