"use client"

import type React from "react"

import { useState, type ReactNode } from "react"

interface AnimatedTooltipProps {
  children: ReactNode
  content: string
  subtext?: string
}

export function AnimatedTooltip({ children, content, subtext }: AnimatedTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseEnter = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY })
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className="relative"
      >
        {children}
      </div>

      {isVisible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: position.x + 10,
            top: position.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="bg-[#2A2E40]/90 backdrop-blur-md border border-[#00FFFF] rounded px-3 py-2 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="text-white text-sm font-medium">{content}</div>
            {subtext && <div className="text-[#AEB5C3] text-xs mt-1">{subtext}</div>}
          </div>
        </div>
      )}
    </>
  )
}
