"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Zap, Check, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { BorderBeam } from "../magicui/border-beam"
import { useSubscription } from "@/hooks/use-subscription"
import { useToast } from "@/hooks/use-toast"

interface ProPlanModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ProPlanModal({ isOpen, onClose }: ProPlanModalProps) {
    const { subscriptionStatus, loading } = useSubscription()
    const { toast } = useToast()
    const [isCheckingPlan, setIsCheckingPlan] = useState(false)
    const [showProConfirmation, setShowProConfirmation] = useState(false)

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
                "Custom AI-Generated Images per Month",
                "Custom AI-Generated Videos per Month"
            ]
        },
        {
            title: "Premium Features",
            features: [
                "Multiplayer Games & Social Features",
                "Custom Voice Recording Sessions",
                "Priority Support & Faster Response Times"
            ]
        }
    ]

    const handleGetStartedClick = async () => {
        setIsCheckingPlan(true)

        try {
            // Attendre un peu pour montrer le chargement
            await new Promise(resolve => setTimeout(resolve, 1000))

            console.log(`[ProPlanModal] Checking user subscription status:`, subscriptionStatus)

            if (!subscriptionStatus) {
                console.log(`[ProPlanModal] No subscription status available`)
                // Rediriger directement si pas de statut
                redirectToTwitter()
                return
            }

            if (subscriptionStatus.is_trial) {
                console.log(`[ProPlanModal] User is on FREE TRIAL - redirecting to Twitter`)
                // Utilisateur en essai gratuit - redirection directe
                redirectToTwitter()
            } else if (subscriptionStatus.is_pro) {
                console.log(`[ProPlanModal] User is already PRO - showing confirmation`)
                // Utilisateur déjà Pro - demander confirmation
                setShowProConfirmation(true)
            } else if (subscriptionStatus.is_expired) {
                console.log(`[ProPlanModal] User subscription EXPIRED - redirecting to Twitter`)
                // Utilisateur expiré - redirection directe
                redirectToTwitter()
            } else {
                console.log(`[ProPlanModal] Unknown subscription status - redirecting to Twitter`)
                // Statut inconnu - redirection directe
                redirectToTwitter()
            }
        } catch (error) {
            console.error(`[ProPlanModal] Error checking subscription:`, error)
            toast({
                title: "Error",
                description: "Unable to verify your current plan. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsCheckingPlan(false)
        }
    }

    const redirectToTwitter = () => {
        console.log(`[ProPlanModal] Redirecting to Twitter`)
        window.open("https://x.com/chrisngand14511?s=21", "_blank")
        onClose()
    }

    const handleProConfirmation = (confirmed: boolean) => {
        if (confirmed) {
            console.log(`[ProPlanModal] User confirmed redirect despite being PRO`)
            redirectToTwitter()
        } else {
            console.log(`[ProPlanModal] User cancelled redirect`)
            setShowProConfirmation(false)
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
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* Header */}
                            <div className="text-center mb-4 flex-shrink-0">
                                <h2 className="text-xl font-bold mb-1">
                                    <span className="text-pink-600">Unlock Pro</span>{" "}
                                    <span className="text-teal-400">Features</span>
                                </h2>

                                {/* --- DÉBUT DE L'AJOUT --- */}
                                <a
                                    href="https://x.com/chrisngand14511?s=21" // <-- Toujours le lien vers votre profil
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center text-center text-gray-300 hover:text-white transition-colors duration-200 text-xs"
                                >
                                    {/* 1ère partie du texte */}
                                    <span>Contact us on</span>

                                    {/* Icône SVG de X, placée au milieu */}
                                    <svg
                                        className="w-3 h-3 mx-1.5" // mx-1.5 ajoute un petit espace avant et après
                                        viewBox="0 0 1200 1227"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                        aria-label="X (Twitter)" // Pour l'accessibilité
                                    >
                                        <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
                                    </svg>

                                    {/* 2ème partie du texte */}
                                    <span>to get your Minato Pro subscription.</span>
                                </a>
                                {/* --- FIN DE L'AJOUT --- */}

                            </div>

                            {/* Pro Plan Card */}
                            <div className="w-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-lg p-3 mb-4 border border-pink-500/30 flex-shrink-0">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-pink-500 font-semibold text-sm">Pro</span>{" "}
                                        <span className="text-teal-400 font-semibold text-sm">Plan</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center space-x-1">
                                            <span className="text-sm font-bold text-white">From</span>
                                            <span className="text-xl font-bold text-white">$25</span>
                                        </div>
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

                            {/* Confirmation Dialog for Pro Users */}
                            {showProConfirmation && (
                                <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                                    <div className="flex items-start">
                                        <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                                        <div className="text-xs text-yellow-200">
                                            <p className="font-semibold mb-1">You are already on the Pro plan!</p>
                                            <p className="mb-2">Would you still like to be redirected to our Twitter page?</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleProConfirmation(true)}
                                                    className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1"
                                                >
                                                    Yes
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleProConfirmation(false)}
                                                    className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20 text-xs px-3 py-1"
                                                >
                                                    No
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CTA Button */}
                            <Button
                                onClick={handleGetStartedClick}
                                disabled={isCheckingPlan || loading}
                                className="w-full bg-gradient-to-r from-pink-600 to-teal-500 hover:from-pink-700 hover:to-teal-600 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCheckingPlan ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Checking plan...
                                    </>
                                ) : (
                                    "Get Started with Pro"
                                )}
                            </Button>
                        </motion.div>
                    )
                    }
                </AnimatePresence >
            </DialogContent >
        </Dialog >
    )
}