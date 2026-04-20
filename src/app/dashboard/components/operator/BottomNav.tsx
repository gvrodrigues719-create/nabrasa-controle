'use client'

import React from 'react'
import { Home, ClipboardList, MapPin, Bell, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  
  const navItems = [
    { id: 'home', label: 'Hoje', icon: Home, url: '/dashboard' },
    { id: 'tasks', label: 'Tarefas', icon: ClipboardList, url: '/dashboard/routines' },
    { id: 'areas', label: 'Áreas', icon: MapPin, url: '/dashboard/areas' },
    { id: 'mural', label: 'Mural', icon: Bell, url: '/dashboard#mural' },
    { id: 'profile', label: 'Perfil', icon: User, url: '/dashboard/profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      {/* Background Blur Overlay */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]" />
      
      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.url || (item.url === '/dashboard' && pathname === '/dashboard')
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
              <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
