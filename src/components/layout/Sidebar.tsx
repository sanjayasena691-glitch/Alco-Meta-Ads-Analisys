import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  Sparkles, 
  Compass, 
  Bell, 
  Target, 
  Share2, 
  Settings, 
  Video,
  Globe,
  ShieldCheck
} from 'lucide-react';

export type NavTab = 
  | 'overview' 
  | 'campaigns' 
  | 'creatives' 
  | 'landing_pages'
  | 'ai_analysis' 
  | 'recommendations' 
  | 'alerts' 
  | 'targets' 
  | 'integrations' 
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  alertCount: number;
  recommendationCount: number;
  landingPageIssueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  alertCount,
  recommendationCount,
  landingPageIssueCount = 0,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'campaigns' as NavTab, label: 'Campaigns', icon: Layers },
    { id: 'creatives' as NavTab, label: 'Creatives', icon: Video },
    { 
      id: 'landing_pages' as NavTab, 
      label: 'Landing Pages', 
      icon: Globe,
      count: landingPageIssueCount > 0 ? landingPageIssueCount : undefined,
      alertColor: 'text-amber-700 bg-amber-50'
    },
    { id: 'ai_analysis' as NavTab, label: 'AI Analysis', icon: Sparkles, badge: 'AI' },
    { id: 'recommendations' as NavTab, label: 'Recommendations', icon: Compass, count: recommendationCount },
    { id: 'alerts' as NavTab, label: 'Alerts', icon: Bell, count: alertCount, alertColor: 'text-red-600 bg-red-50' },
    { id: 'targets' as NavTab, label: 'Targets', icon: Target },
    { id: 'integrations' as NavTab, label: 'Integrations', icon: Share2 },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            AL
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">
            ALCO <span className="text-indigo-600">Meta</span>
          </span>
        </div>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
          Ads Analyst v1.0
        </p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.alertColor || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Connected Ad Account Panel */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">
            Connected Ad Account
          </p>
          <p className="text-xs font-semibold text-gray-900 truncate">
            ALCO Creative Studio_01
          </p>
          <p className="text-[10px] text-green-500 flex items-center gap-1 mt-1.5 font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Synced &bull; Safe Analysis Mode
          </p>
        </div>
      </div>
    </aside>
  );
};
