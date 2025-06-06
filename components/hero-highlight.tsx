"use client"

import { useState, useEffect } from "react"

const japaneseSequence = ["システム初期化...", "知能コア接続中...", "論理回路展開...", "未来展望開始"]

export function HeroHighlight() {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [showEnglish, setShowEnglish] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPhase < japaneseSequence.length - 1) {
        setCurrentPhase((prev) => prev + 1)
      } else {
        setShowEnglish(true)
        clearInterval(interval)
      }
    }, 400)

    return () => clearInterval(interval)
  }, [currentPhase])

  return (
    <div className="text-center relative">
      {!showEnglish ? (
        <div className="h-20 flex items-center justify-center">
          <div className="text-[#00FFFF] text-lg font-mono glitch-text">{japaneseSequence[currentPhase]}</div>
        </div>
      ) : (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
          <h2 className="text-2xl md:text-5xl font-bold text-white mb-4 hero-glow">
            Minato AI: Intelligence.{" "}
            <span className="text-[#00FFFF] relative">
              Reimagined.
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine"></div>
            </span>
          </h2>
          <p className="text-[#D0D0E0] text-sm md:text-lg max-w-2xl mx-auto">
            Experience the next evolution of artificial intelligence companionship
          </p>
        </div>
      )}
    </div>
  )
}
