import React from 'react';
import { 
  Bell, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { AnomalyAlert, AlertSeverity } from '../../types';

interface AlertSystemViewProps {
  alerts: AnomalyAlert[];
  onAnalyzeAlert: (alert: AnomalyAlert) => void;
  onDismissAlert?: (alertId: string) => void;
}

export const AlertSystemView: React.FC<AlertSystemViewProps> = ({
  alerts,
  onAnalyzeAlert,
  onDismissAlert,
}) => {
  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          container: 'border-rose-300 bg-rose-50/30',
          label: 'CRITICAL',
        };
      case 'WARNING':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          container: 'border-amber-300 bg-amber-50/30',
          label: 'WARNING',
        };
      case 'INFO':
      default:
        return {
          icon: Info,
          bg: 'bg-sky-100 text-sky-800 border-sky-300',
          container: 'border-slate-200 bg-white',
          label: 'INFO',
        };
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  return (
    <div className="space-y-6">
      {/* Alert Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <Bell className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Deteksi Anomali &amp; Peringatan Dini
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Memantau lonjakan CPA, penurunan drastis CTR, kelelahan materi (High Frequency), serta spend tanpa konversi 
              secara real-time agar terhindar dari pemborosan budget.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
              {criticalCount} Critical
            </span>
            <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl">
              {warningCount} Warning
            </span>
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3.5">
        {alerts.map((alert) => {
          const sev = getSeverityBadge(alert.severity);
          const SevIcon = sev.icon;

          return (
            <div
              key={alert.id}
              className={`rounded-2xl border p-5 transition-all hover:shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4 ${sev.container}`}
            >
              <div className="space-y-2 flex-1">
                {/* Header Tag */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sev.bg}`}>
                    <SevIcon className="w-3 h-3" />
                    <span>{sev.label}</span>
                  </span>

                  <span className="text-xs font-bold text-slate-900">
                    [{alert.entityType.toUpperCase()}] {alert.entityName}
                  </span>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{alert.timestamp}</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900">
                  {alert.title}
                </h3>

                {/* Metric Change */}
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                  <span className="text-slate-500 font-normal">Perubahan Metrik:</span>
                  <span className="text-rose-700 font-bold">{alert.changeDescription || alert.metricLabel}</span>
                </div>

                {/* Possible Cause */}
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  <strong className="text-slate-800">Kemungkinan Penyebab:</strong> {alert.possibleCause}
                </p>

                {/* Recommendation snippet */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                  <strong className="text-slate-900">Rekomendasi Aksi:</strong> {alert.recommendedAction}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center md:flex-col justify-end gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => onAnalyzeAlert(alert)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Diagnosa AI</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <span>Semua campaign dan creative berjalan normal tanpa deteksi anomali.</span>
          </div>
        )}
      </div>
    </div>
  );
};
