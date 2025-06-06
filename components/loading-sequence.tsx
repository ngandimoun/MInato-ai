"use client"

import { useState, useEffect } from "react"

const loadingMessages = ["待機モード解除", "システム起動中...", "認証成功", "全システム、オンライン"]

export function LoadingSequence() {
  const [currentMessage, setCurrentMessage] = useState(0)
  const [showLine, setShowLine] = useState(false)

  useEffect(() => {
    const sequence = async () => {
      // Initial message
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Show line animation
      setShowLine(true)
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Cycle through messages
      for (let i = 1; i < loadingMessages.length; i++) {
        setCurrentMessage(i)
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
    }

    sequence()
  }, [])

  return (
    <div className="min-h-screen bg-[#030613] flex items-center justify-center relative overflow-hidden">
      {/* Animated line */}
      {showLine && (
        <div className="absolute top-1/2 left-0 right-0 h-px">
          <div className="h-full bg-gradient-to-r from-transparent via-[#00FFFF] to-transparent animate-line-sweep"></div>
        </div>
      )}

      {/* Loading message */}
      <div className="text-center">
        <div className="text-[#00FFFF] text-xl font-mono mb-8 animate-pulse">{loadingMessages[currentMessage]}</div>

        {currentMessage === loadingMessages.length - 1 && (
          <div className="w-8 h-8 border-2 border-[#00FFFF] border-t-transparent rounded-full animate-spin mx-auto"></div>
        )}
      </div>
    </div>
  )
}
