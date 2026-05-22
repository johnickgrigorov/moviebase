import { NavLink } from 'react-router-dom';
import { Home, Search, Library, User } from 'lucide-react';
import clsx from 'clsx';

const tabs = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/search', label: 'Поиск', icon: Search },
  { to: '/lists', label: 'Списки', icon: Library },
  { to: '/profile', label: 'Профиль', icon: User },
];

export function NavBar() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-app border-t border-border bg-bg/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 py-2.5 transition-colors',
                isActive ? 'text-accent' : 'text-text-muted active:text-text',
              )
            }
          >
            <t.icon size={22} strokeWidth={1.6} />
            <span className="text-[10px] tracking-wide uppercase">{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
