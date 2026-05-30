'use client'

import React from 'react'
import { Home, ClipboardList, ShoppingCart, Truck, Factory } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function KitchenBottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Hoje',
      icon: Home,
      href: '/dashboard/kitchen',
      activePattern: /^\/dashboard\/kitchen$/
    },
    {
      label: 'Contagem',
      icon: ClipboardList,
      href: '/dashboard/kitchen/count',
      activePattern: /^\/dashboard\/kitchen\/count(\/.*)?$/
    },
    {
      label: 'Pedidos',
      icon: ShoppingCart,
      href: '/dashboard/kitchen/planning',
      activePattern: /^\/dashboard\/kitchen\/planning(\/.*)?$/
    },
    {
      label: 'Recebimentos',
      icon: Truck,
      href: '/dashboard/kitchen/receivings',
      activePattern: /^\/dashboard\/kitchen\/receivings(\/.*)?$/
    },
    {
      label: 'Produção',
      icon: Factory,
      href: '/dashboard/kitchen/production',
      activePattern: /^\/dashboard\/kitchen\/production(\/.*)?$/
    }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]" />
      
      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || item.activePattern.test(pathname)
          const Icon = item.icon
          
          return (
            <Link 
              key={item.label} 
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90 ${
                isActive ? 'text-orange-600' : 'text-gray-400'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className={`w-5 h-5 ${isActive ? 'fill-current opacity-10' : ''}`} />
                {isActive && (
                  <div className="absolute -top-1.5 -right-1.5 w-1 h-1 bg-orange-600 rounded-full" />
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
