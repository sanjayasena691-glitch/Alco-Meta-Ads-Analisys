import React, { useState } from 'react';
import { X, Check, Link2, ExternalLink, AlertCircle } from 'lucide-react';
import { Campaign } from '../../types';
import { LandingPageWithMetrics } from '../../services/clarity/clarityTypes';

interface CampaignMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  landingPage: LandingPageWithMetrics;
  availableCampaigns: Campaign[];
  onSaveMapping: (lpId: string, linkedCampaignIds: string[]) => void;
}

export const CampaignMappingModal: React.FC<CampaignMappingModalProps> = ({
  isOpen,
  onClose,
  landingPage,
  availableCampaigns,
  onSaveMapping,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    landingPage.profile.linkedCampaignIds || []
  );

  if (!isOpen) return null;

  const toggleCampaign = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSaveMapping(landingPage.profile.id, selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Hubungkan Landing Page ke Campaign
              </h3>
              <p className="text-xs text-gray-500">
                Pilih campaign Meta Ads yang mengirimkan traffic ke halaman ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Landing Page Info */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4 text-xs">
          <div className="font-bold text-gray-900">{landingPage.profile.name}</div>
          <div className="text-gray-500 truncate font-mono mt-0.5">{landingPage.profile.url}</div>
        </div>

        {/* Campaign Selection List */}
        <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-1">
          {availableCampaigns.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              Tidak ada campaign Meta yang tersedia.
            </div>
          ) : (
            availableCampaigns.map((camp) => {
              const isChecked = selectedIds.includes(camp.id);
              return (
                <div
                  key={camp.id}
                  onClick={() => toggleCampaign(camp.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-indigo-50/70 border-indigo-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="text-xs font-semibold text-gray-900 truncate">
                      {camp.name}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Spend: Rp{camp.metrics.spend.toLocaleString('id-ID')} | Clicks: {camp.metrics.clicks} | ROAS: {camp.metrics.roas.toFixed(2)}x
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Explanation */}
        <div className="flex items-start gap-2 text-[11px] text-gray-500 mb-5 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/70">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Diagnosis funnel akan otomatis mengombinasikan metrik link click Meta dengan sesi Clarity dari campaign yang dipilih.
          </span>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
          >
            Simpan Hubungan
          </button>
        </div>
      </div>
    </div>
  );
};
