"use client"

import { useEffect, useState } from "react"

export function SmoothCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
    }

    const hideCursor = () => setIsVisible(false)

    window.addEventListener("mousemove", updatePosition)
    window.addEventListener("mouseleave", hideCursor)

    return () => {
      window.removeEventListener("mousemove", updatePosition)
      window.removeEventListener("mouseleave", hideCursor)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      className="fixed pointer-events-none z-50 mix-blend-difference"
      style={{
        left: position.x - 8,
        top: position.y - 8,
        transition: "all 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      <div className="w-4 h-4 border border-[#00FFFF] rounded-full">
        <div className="w-1 h-1 bg-[#00FFFF] rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>
    </div>
  )
}
