import React from 'react';

export type ActiveTab = 'track' | 'admin';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onFocusSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onFocusSearch,
}) => {
  const navItems: Array<{ key: ActiveTab; label: string }> = [
    { key: 'track', label: 'ติดตามสินเชื่อ' },
    { key: 'admin', label: 'สำหรับเจ้าหน้าที่' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#F6F4EF]/92 backdrop-blur-md border-b border-[#E2DDD4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('track')}
          className="font-display text-2xl font-semibold tracking-[0.16em] text-[#14171A] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A7B4F] rounded"
        >
          GAVIN
        </button>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectTab(item.key)}
                className={`relative py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A7B4F] rounded ${
                  isActive
                    ? 'text-[#14171A] font-semibold'
                    : 'text-[#57534E] hover:text-[#14171A]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-[1px] h-[1.5px] bg-[#9A7B4F]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectTab('track');
              onFocusSearch();
            }}
            className="px-4 py-2 bg-[#14171A] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#272B30] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A7B4F]"
          >
            ตรวจสอบสถานะ
          </button>
        </div>
      </div>

      <nav className="flex md:hidden items-center justify-between px-4 py-2 border-t border-[#E2DDD4] bg-[#F6F4EF] overflow-x-auto gap-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              className={`text-xs py-1 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'text-[#14171A] font-semibold border-b-2 border-[#9A7B4F]'
                  : 'text-[#57534E]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
