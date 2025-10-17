"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from 'lucide-react';
import { NAVIGATION_SECTIONS } from "@/constants/credit-contract";
import { useNavigation } from "@/hooks/useNavigation";
import { useEffect } from "react";

interface NavigationProps {
  currentPage?: string;
  className?: string;
}

export default function Navigation({ currentPage, className = "" }: NavigationProps) {
  const { navigateTo, isActivePath } = useNavigation();
  useEffect(() => {
    const onVisibility = () => {
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleNavigation = (href?: string, onClick?: () => void) => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigateTo(href);
    }
  };

  return (
    <nav className={`h-full overflow-y-auto py-2 ${className}`}>
      <div className="px-3 space-y-1">
        {NAVIGATION_SECTIONS.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? "mt-6" : ""}>
            {section.title !== "Chính" && (
              <div className="px-3 py-2 mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>
            )}
            
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = item.href ? isActivePath(item.href) : currentPage === item.id;
                const IconComponent = item.icon;
                const totalDebtContracts = 0;
                const computedBadge = item.id === "no-phai-thu" ? totalDebtContracts : item.badge;
                
                return (
                  <div key={item.id} className="relative">
                    <Button
                      variant="ghost"
                      className={`w-full grid grid-cols-[auto_1fr_auto] items-center h-12 text-left transition-all duration-200 rounded-xl relative overflow-hidden group ${
                        isActive 
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:from-teal-600 hover:to-emerald-600" 
                          : "text-slate-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 hover:text-slate-800 hover:shadow-sm"
                      }`}
                      onClick={() => handleNavigation(item.href, item.onClick)}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-emerald-400/20 blur-xl" />
                      )}
                      
                      <div className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isActive 
                          ? 'bg-white/20 shadow-inner' 
                          : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm'
                      }`}>
                        <IconComponent className={`h-5 w-5 transition-colors duration-200 ${
                          isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-700'
                        }`} />
                      </div>
                      
                      <div className="flex-1 relative pl-3">
                        <span className={`font-medium text-sm transition-colors duration-200 truncate ${
                          isActive ? 'text-white' : 'text-slate-700 group-hover:text-slate-800'
                        }`}>
                          {item.title}
                        </span>
                      </div>
                      
                      <div className="ml-auto flex items-center justify-end w-20 shrink-0 gap-2">
                        {(typeof computedBadge === 'number' && computedBadge > 0) || (computedBadge && typeof computedBadge === 'object' && computedBadge.show && computedBadge.count > 0) ? (
                          <Badge className="bg-red-500 text-white text-[11px] leading-none px-2 py-1 rounded-full shadow-lg animate-pulse tabular-nums text-center min-w-[28px]">
                            {typeof computedBadge === 'number' ? computedBadge : computedBadge.count}
                          </Badge>
                        ) : (
                          <span className="inline-block px-2 py-1 invisible select-none min-w-[28px]">99</span>
                        )}
                        {section.title === "Quản lý" && (
                          <ChevronRight className={`h-4 w-4 transition-colors duration-200 ${
                            isActive 
                              ? 'text-white/80' 
                              : 'text-slate-400 group-hover:text-slate-600'
                          }`} />
                        )}
                      </div>
                      
                      {item.id === "reports" && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg" />
                      )}
                    </Button>
                    
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

// Mobile bottom navigation

type BottomItem = {
  id: string;
  title: string;
  href?: string;
  icon: any;
};

function getBottomItems(): BottomItem[] {
  const items: BottomItem[] = [];
  for (const section of NAVIGATION_SECTIONS) {
    for (const it of section.items) {
      if (!it.href) continue;
      items.push({ id: it.id, title: it.title, href: it.href, icon: it.icon });
    }
  }
  return items;
}

export function MobileBottomNav() {
  const { navigateTo, isActivePath } = useNavigation();
  const items = getBottomItems();
  const unpaidCount = 0; // badge count placeholder

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-50">
      <div className="relative w-full">
        <div className="w-full rounded-t-2xl bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
          <div className="flex items-end justify-between">
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.href ? isActivePath(item.href) : false;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.title}
                  onClick={() => item.href && navigateTo(item.href)}
                  className="flex-1 basis-0 flex flex-col items-center gap-1 py-2"
                >
                  <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${active ? 'bg-sky-100 shadow-inner scale-110' : 'bg-slate-100'}`}>
                    <Icon className={`h-5 w-5 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
                    {item.id === 'no-phai-thu' && unpaidCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full shadow">{unpaidCount}</Badge>
                    )}
                  </div>
                  <span className={`text-[11px] leading-none h-[14px] ${active ? 'text-sky-600 font-semibold' : 'text-transparent'}`}>{active ? item.title : '.'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
