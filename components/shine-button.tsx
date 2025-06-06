"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface ShineButtonProps {
  children: ReactNode
  onClick?: () => void
}

export function ShineButton({ children, onClick }: ShineButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="hidden md:block bg-[#FF073A] hover:bg-[#FF073A]/90 text-white border-0 relative overflow-hidden group transition-all duration-300 shine-button"
    >
      <span className="relative z-10 flex items-center">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
    </Button>
  )
}
