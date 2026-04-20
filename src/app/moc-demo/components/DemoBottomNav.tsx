
'use client'

import React from 'react'
import { Home, ClipboardList, Bell, User, Map } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DemoBottomNav() {
  const pathname = usePathname()
  
  const navItems = [
    { id: 'dashboard', label: 'Hoje', icon: Home, url: '/moc-demo/dashboard' },
    { id: 'routines', label: 'Rotinas', icon: ClipboardList, url: '/moc-demo/routines' },
    { id: 'areas', label: 'Áreas', icon: Map, url: '/moc-demo/areas' },
    { id: 'notices', label: 'Mural', icon: Bell, url: '/moc-demo/notices' },
    { id: 'profile', label: 'Perfil', icon: User, url: '/moc-demo/profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 md:pb-safe">
      {/* Background Blur Overlay */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]" />
      
      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.url
          const Icon = item.icon
          
          return (
            <Link 
              key={item.id} 
              href={item.url}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90 ${
                isActive ? 'text-[#B13A2B]' : 'text-gray-400'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className={`w-5 h-5 ${isActive ? 'fill-current opacity-10' : ''}`} />
                {isActive && (
                  <div className="absolute -top-1.5 -right-1.5 w-1 h-1 bg-[#B13A2B] rounded-full" />
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
