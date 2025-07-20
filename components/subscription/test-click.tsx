"use client"

import React, { useState } from 'react'

export function TestClick() {
  const [isVisible, setIsVisible] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  const handleClick = () => {
    console.log('[TestClick] Button clicked!')
    setClickCount(prev => prev + 1)
    setIsVisible(true)
    
    setTimeout(() => {
      setIsVisible(false)
    }, 3000)
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* Message de test */}
      {isVisible && (
        <div className="bg-blue-100 border border-blue-200 rounded-lg px-4 py-3 mb-2 shadow-lg">
          <span className="text-sm font-medium text-blue-700">
            Test click fonctionne ! Clic #{clickCount}
          </span>
        </div>
      )}
      
      {/* Bouton de test */}
      <div
        className="w-12 h-12 bg-blue-500 rounded-full shadow-lg border-2 flex items-center justify-center cursor-pointer hover:bg-blue-600 active:scale-95 transition-all duration-200"
        onClick={handleClick}
        title="Test de clic"
      >
        <span className="text-white font-bold">T</span>
      </div>
    </div>
  )
} 