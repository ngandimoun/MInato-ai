"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Zap, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { BorderBeam } from "../magicui/border-beam"
import { useToast } from "@/hooks/use-toast"

interface ProPlanModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ProPlanModal({ isOpen, onClose }: ProPlanModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const featureCategories = [
        {
            title: "Core Features",
            features: [
                "Unlimited AI Chat Conversations",
                "Persistent Memory & Conversation History",
            ]
        },
        {
            title: "Creation Hub",
            features: [
                "AI-Powered Lead Generation Tools",
                "30 AI-Generated Images per Month",
                "20 AI-Generated Videos per Month"
            ]
        },
        {
            title: "Premium Features",
            features: [
                "Multiplayer Games & Social Features",
                "20 Recording Sessions",
                "Priority Support & Faster Response Times"
            ]
        }
    ]

    const handleUpgradeToPro = async () => {
        setIsLoading(true)
        
        try {
            // Capturer l'URL actuelle pour la redirection après paiement
            const currentUrl = window.location.href;
            
            const response = await fetch('/api/subscription/upgrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    returnUrl: currentUrl
                })
            })

            const data = await response.json()

            if (data.success && data.checkoutUrl) {
                // Rediriger vers Stripe Checkout
                window.location.href = data.checkoutUrl
            } else {
                throw new Error(data.error || 'Failed to create checkout session')
            }
        } catch (error: any) {
            console.error('Error upgrading to Pro:', error)
            toast({
                title: "Upgrade Failed",
                description: error.message || "Failed to start upgrade process. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full sm:max-w-lg lg:max-w-2xl p-0 border-none bg-transparent max-h-[90vh] overflow-hidden">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="relative bg-gray-900 rounded-lg p-4 w-full mx-auto max-h-[85vh] flex flex-col"
                        >
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                                disabled={isLoading}
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* Header */}
                            <div className="text-center mb-4 flex-shrink-0">
                                <h2 className="text-xl font-bold mb-1">
                                    <span className="text-pink-600">Unlock Pro</span>{" "}
                                    <span className="text-teal-400">Features</span>
                                </h2>
                                <p className="text-gray-300 text-xs">
                                    Supercharge Minato with the Pro plan.
                                </p>
                            </div>

                            {/* Pro Plan Card */}
                            <div className="w-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-lg p-3 mb-4 border border-pink-500/30 flex-shrink-0">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-pink-500 font-semibold text-sm">Pro</span>{" "}
                                        <span className="text-teal-400 font-semibold text-sm">Plan</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-white">$25</div>
                                        <div className="text-xs text-gray-300">/month</div>
                                    </div>
                                </div>

                                <p className="text-gray-300 text-xs mb-3">
                                    Unlock the full Minato experience with:
                                </p>

                                {/* Features list */}
                                <div className="space-y-3 flex-1 overflow-y-auto">
                                    {featureCategories.map((category, categoryIndex) => (
                                        <div key={categoryIndex}>
                                            <h4 className="text-xs font-semibold text-pink-400 mb-1.5">
                                                {category.title}
                                            </h4>
                                            <ul className="space-y-1">
                                                {category.features.map((feature, featureIndex) => (
                                                    <li key={featureIndex} className="flex items-start text-xs text-gray-200 leading-relaxed">
                                                        <Check className="h-3 w-3 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                                <BorderBeam
                                    duration={6}
                                    size={400}
                                    className="from-transparent via-primary to-transparent"
                                />
                                <BorderBeam
                                    duration={6}
                                    delay={3}
                                    size={400}
                                    borderWidth={2}
                                    className="from-red-500 via-blue-500 to-primary"
                                />
                            </div>

                            {/* CTA Button */}
                            <Button
                                onClick={handleUpgradeToPro}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-pink-600 to-teal-500 hover:from-pink-700 hover:to-teal-600 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-4 w-4 mr-2" />
                                        Get Started with Pro
                                    </>
                                )}
                            </Button>

                            {/* Additional info */}
                            <p className="text-xs text-gray-400 text-center mt-2 flex-shrink-0">
                                Secure payment powered by Stripe. Cancel anytime.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}