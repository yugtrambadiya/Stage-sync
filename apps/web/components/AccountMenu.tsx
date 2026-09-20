'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, logout } from '../lib/auth';
import { useTheme } from './ThemeProvider';

export default function AccountMenu() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ name: string | null; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await fetchMe();
        setUser(data);
      } catch (err) {
        // Not authenticated or error
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className="account-menu-skeleton" />;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          className="btn btn--ghost btn--sm" 
          onClick={() => router.push('/auth/login')}
        >
          Sign In
        </button>
        <button 
          className="btn btn--primary btn--sm" 
          onClick={() => router.push('/auth/register')}
        >
          Get Started
        </button>
      </div>
    );
  }

  const initials = (user.name || user.email).substring(0, 2).toUpperCase();

  return (
    <div className="account-menu" ref={menuRef}>
      <button 
        className="account-menu__trigger" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account menu"
      >
        <div className="account-menu__avatar">{initials}</div>
      </button>

      {isOpen && (
        <div className="account-menu__dropdown">
          <div className="account-menu__header">
            <div className="account-menu__name">{user.name || 'User'}</div>
            <div className="account-menu__email">{user.email}</div>
          </div>
          
          <div className="account-menu__divider" />
          
          <button className="account-menu__item" onClick={() => router.push('/events')}>
            <span>🎛️ Control Room</span>
          </button>
          
          <div className="account-menu__divider" />
          
          <button className="account-menu__item" onClick={toggleTheme}>
            <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
          </button>
          
          <div className="account-menu__divider" />
          
          <button 
            className="account-menu__item account-menu__item--danger" 
            onClick={() => {
              logout();
              router.push('/auth/login');
            }}
          >
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
