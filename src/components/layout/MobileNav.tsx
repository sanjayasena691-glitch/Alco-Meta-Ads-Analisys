import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  Sparkles, 
  Video, 
  MoreHorizontal,
  Compass,
  Bell,
  Target,
  Share2,
  Settings,
  X
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  alertCount: number;
  recommendationCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  alertCount,
  recommendationCount,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs = [
    { id: 'overview' as NavTab, label: 'Home', icon: LayoutDashboard },
    { id: 'campaigns' as NavTab, label: 'Campaigns', icon: Layers },
    { id: 'creatives' as NavTab, label: 'Creatives', icon: Video },
    { id: 'ai_analysis' as NavTab, label: 'AI', icon: Sparkles, badge: true },
  ];

  const secondaryTabs = [
    { id: 'recommendations' as NavTab, label: 'Recommendations', icon: Compass, count: recommendationCount },
    { id: 'alerts' as NavTab, label: 'Alerts', icon: Bell, count: alertCount },
    { id: 'targets' as NavTab, label: 'Targets', icon: Target },
    { id: 'integrations' as NavTab, label: 'Integrations', icon: Share2 },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Secondary Drawer Modal */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/40 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl p-5 border-t border-gray-200 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="font-bold text-gray-900 text-sm">Menu Tambahan</span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-4">
              {secondaryTabs.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsMoreOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg text-left border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                        : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs truncate">{item.label}</span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="ml-auto text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 py-1.5 flex items-center justify-around shadow-sm">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                isActive ? 'text-indigo-600 font-bold' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full" />
                )}
              </div>
              <span className="mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            secondaryTabs.some((t) => t.id === currentTab) ? 'text-indigo-600 font-bold' : 'text-gray-400'
          }`}
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          <span className="mt-0.5">Lainnya</span>
        </button>
      </div>
    </>
  );
};
