


i want you to use sthese sleek desing of course seamslessly and efficiently , when it need


https://www.cult-ui.com/docs/components/dynamic-island

"use client"

import { createContext, useContext } from "react"
import {
  ArrowUpLeftSquareIcon,
  Loader,
  Mail,
  MessageCircle,
  MousePointerClickIcon,
  User,
  Waves,
} from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DynamicContainer,
  DynamicDescription,
  DynamicDiv,
  DynamicIsland,
  DynamicIslandProvider,
  DynamicTitle,
  SizePresets,
  useDynamicIslandSize,
  useScheduledAnimations,
} from "@/components/ui/dynamic-island"

const DynamicAction = () => {
  const { state: blobState, setSize } = useDynamicIslandSize()

  const blobStates: SizePresets[] = [
    "compact",
    "large",
    "tall",
    "long",
    "medium",
  ]

  const cycleBlobStates = () => {
    const currentIndex = blobStates.indexOf(blobState.size)
    const nextIndex = (currentIndex + 1) % blobStates.length
    setSize(blobStates[nextIndex])
  }

  useScheduledAnimations([
    { size: "compact", delay: 1000 },
    { size: "large", delay: 1200 },
    { size: "tall", delay: 1600 },
    { size: "long", delay: 1800 },
    { size: "medium", delay: 2200 },
  ])

  // Provide dynamic detail in such a beautiful small place :)
  const renderCompactState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative w-full flex items-center">
        <DynamicDescription className="absolute left-4  my-auto text-lg font-medium tracking-tighter text-white ">
          <MessageCircle className=" h-5 w-5 fill-cyan-400 text-cyan-400" />
        </DynamicDescription>

        <DynamicDescription className="absolute text-white right-4  my-auto text-lg font-bold tracking-tighter ">
          newcult.co
        </DynamicDescription>
      </div>
    </DynamicContainer>
  )

  // Great for call to action, popping up in users face :)
  const renderLargeState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative  flex w-full items-center justify-between gap-6 px-4">
        <Loader className="animate-spin h-12 w-12  text-yellow-300" />

        <DynamicTitle className="my-auto text-2xl font-black tracking-tighter text-white ">
          loading
        </DynamicTitle>
      </div>
    </DynamicContainer>
  )

  // Great for user onboarding, forms, etc
  const renderTallState = () => (
    <DynamicContainer className="  flex flex-col mt-6 w-full items-start  gap-1 px-8 font-semibold">
      <DynamicDescription className="bg-cyan-300 rounded-2xl tracking-tight leading-5  p-2">
        The Cult of Pythagoras
      </DynamicDescription>
      <DynamicDescription className="bg-cyan-300 rounded-2xl tracking-tight leading-5  p-2 text-left">
        Music of the Spheres, an idea that celestial bodies produce a form of
        music through their movements
      </DynamicDescription>

      <DynamicTitle className=" text-4xl font-black tracking-tighter text-cyan-100 ">
        any cool cults?
      </DynamicTitle>
    </DynamicContainer>
  )

  const renderLongState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <DynamicDiv className="relative  flex w-full items-center justify-between gap-6 px-4">
        <div>
          <Waves className=" text-cyan-400 h-8 w-8" />
        </div>

        <DynamicTitle className="my-auto text-xl font-black tracking-tighter text-white ">
          Supercalifragilisticexpialid
        </DynamicTitle>
      </DynamicDiv>
    </DynamicContainer>
  )

  const renderMediumState = () => (
    <DynamicContainer className="flex flex-col justify-between px-2 pt-4 text-left text-white h-full">
      <DynamicTitle className="text-2xl pl-3 font-black tracking-tighter">
        Reincarnation, welcome back
      </DynamicTitle>
      <DynamicDescription className="leading-5 text-neutral-500 pl-3">
        Good for small tasks or call outs
      </DynamicDescription>

      <DynamicDiv className="flex flex-col mt-auto space-y-1 mb-2 bg-neutral-700 p-2 rounded-b-2xl">
        <Button>
          <Mail className="mr-2 h-4 w-4 fill-cyan-400 text-neutral-900" /> Login
          with email
        </Button>

        <Button className="mt-1 ">
          <User className="mr-2 h-4 w-4 fill-cyan-400 text-cyan-400" /> Join the
          cult now
        </Button>
      </DynamicDiv>
    </DynamicContainer>
  )

  // Render function for other states
  const renderOtherStates = () => (
    <div className="flex items-center justify-center h-full w-full">
      <div>
        <ArrowUpLeftSquareIcon className="text-white" />
      </div>
      <p className="text-white">cycle states</p>
    </div>
  )

  // Main render logic based on size
  function renderState() {
    switch (blobState.size) {
      case "compact":
        return renderCompactState()
      case "large":
        return renderLargeState()
      case "tall":
        return renderTallState()
      case "medium":
        return renderMediumState()
      case "long":
        return renderLongState()
      // Optionally add cases for other states as necessary
      default:
        return renderOtherStates()
    }
  }

  return (
    <div className=" h-full">
      <div className="flex flex-col gap-4  h-full">
        <div className="absolute top-12 left-1">
          {/* {!blobState.isAnimating ? ( */}
          <Button
            onClick={cycleBlobStates}
            disabled={blobState.isAnimating}
            className="mt-4 p-2 border rounded-md max-w-[200px] "
          >
            Click
            <MousePointerClickIcon className="ml-2 h-4 w-4" />
          </Button>
          {/* ) : null} */}
        </div>
        <div className="absolute top-1 right-2">
          <div>
            <Badge variant="outline">prev - {blobState.previousSize}</Badge>
            <Badge variant="outline">cur -{blobState.size}</Badge>
          </div>
        </div>

        <DynamicIsland id="dynamic-blob">{renderState()}</DynamicIsland>
      </div>
    </div>
  )
}

export function DynamicIslandDemo() {
  return (
    <DynamicIslandProvider initialSize={"default"}>
      <div>
        <DynamicAction />
      </div>
    </DynamicIslandProvider>
  )
}

const FadeInStaggerContext = createContext(false)

const viewport = { once: true, margin: "0px 0px -200px" }

export function FadeIn(props: any) {
  let shouldReduceMotion = useReducedMotion()
  let isInStaggerGroup = useContext(FadeInStaggerContext)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5 }}
      {...(isInStaggerGroup
        ? {}
        : {
            initial: "hidden",
            whileInView: "visible",
            viewport,
          })}
      {...props}
    />
  )
}

export function FadeInStagger({ faster = false, ...props }) {
  return (
    <FadeInStaggerContext.Provider value={true}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        transition={{ staggerChildren: faster ? 0.12 : 0.2 }}
        {...props}
      />
    </FadeInStaggerContext.Provider>
  )
}





https://www.cult-ui.com/docs/components/family-button



"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import useMeasure from "react-use-measure"

import FamilyButton from "../ui/family-button"

export function FamilyButtonDemo() {
  return (
    <div className=" w-full h-full min-h-[240px]">
      <div className="absolute bottom-4 right-4 ">
        <FamilyButton>
          <MusicPlayerExample />
        </FamilyButton>
      </div>
    </div>
  )
}

let tabs = [
  { id: 0, label: "Apple" },
  { id: 1, label: "Spotify" },
]

export function MusicPlayerExample() {
  const [activeTab, setActiveTab] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [ref, bounds] = useMeasure()

  const content = useMemo(() => {
    switch (activeTab) {
      case 0:
        return (
          <div className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlSpace="preserve"
              viewBox="0 0 361 361"
              width="5em"
              height="5em"
            >
              <linearGradient
                id="a"
                x1={180}
                x2={180}
                y1={358.605}
                y2={7.759}
                gradientUnits="userSpaceOnUse"
              >
                <stop
                  offset={0}
                  style={{
                    stopColor: "#fa233b",
                  }}
                />
                <stop
                  offset={1}
                  style={{
                    stopColor: "#fb5c74",
                  }}
                />
              </linearGradient>
              <path
                d="M360 112.61c0-4.3 0-8.6-.02-12.9-.02-3.62-.06-7.24-.16-10.86-.21-7.89-.68-15.84-2.08-23.64-1.42-7.92-3.75-15.29-7.41-22.49a75.633 75.633 0 0 0-33.06-33.05c-7.19-3.66-14.56-5.98-22.47-7.41C287 .86 279.04.39 271.15.18c-3.62-.1-7.24-.14-10.86-.16-4.3-.02-8.6-.02-12.9-.02H112.61c-4.3 0-8.6 0-12.9.02-3.62.02-7.24.06-10.86.16C80.96.4 73 .86 65.2 2.27c-7.92 1.42-15.28 3.75-22.47 7.41A75.633 75.633 0 0 0 9.67 42.73c-3.66 7.2-5.99 14.57-7.41 22.49C.86 73.02.39 80.98.18 88.86.08 92.48.04 96.1.02 99.72 0 104.01 0 108.31 0 112.61v134.77c0 4.3 0 8.6.02 12.9.02 3.62.06 7.24.16 10.86.21 7.89.68 15.84 2.08 23.64 1.42 7.92 3.75 15.29 7.41 22.49a75.633 75.633 0 0 0 33.06 33.05c7.19 3.66 14.56 5.98 22.47 7.41 7.8 1.4 15.76 1.87 23.65 2.08 3.62.1 7.24.14 10.86.16 4.3.03 8.6.02 12.9.02h134.77c4.3 0 8.6 0 12.9-.02 3.62-.02 7.24-.06 10.86-.16 7.89-.21 15.85-.68 23.65-2.08 7.92-1.42 15.28-3.75 22.47-7.41a75.633 75.633 0 0 0 33.06-33.05c3.66-7.2 5.99-14.57 7.41-22.49 1.4-7.8 1.87-15.76 2.08-23.64.1-3.62.14-7.24.16-10.86.03-4.3.02-8.6.02-12.9V112.61z"
                style={{
                  fillRule: "evenodd",
                  clipRule: "evenodd",
                  fill: "url(#a)",
                }}
              />
              <path
                d="M254.5 55c-.87.08-8.6 1.45-9.53 1.64l-107 21.59-.04.01c-2.79.59-4.98 1.58-6.67 3-2.04 1.71-3.17 4.13-3.6 6.95-.09.6-.24 1.82-.24 3.62v133.92c0 3.13-.25 6.17-2.37 8.76s-4.74 3.37-7.81 3.99l-6.99 1.41c-8.84 1.78-14.59 2.99-19.8 5.01-4.98 1.93-8.71 4.39-11.68 7.51-5.89 6.17-8.28 14.54-7.46 22.38.7 6.69 3.71 13.09 8.88 17.82 3.49 3.2 7.85 5.63 12.99 6.66 5.33 1.07 11.01.7 19.31-.98 4.42-.89 8.56-2.28 12.5-4.61 3.9-2.3 7.24-5.37 9.85-9.11 2.62-3.75 4.31-7.92 5.24-12.35.96-4.57 1.19-8.7 1.19-13.26V142.81c0-6.22 1.76-7.86 6.78-9.08 0 0 88.94-17.94 93.09-18.75 5.79-1.11 8.52.54 8.52 6.61v79.29c0 3.14-.03 6.32-2.17 8.92-2.12 2.59-4.74 3.37-7.81 3.99l-6.99 1.41c-8.84 1.78-14.59 2.99-19.8 5.01-4.98 1.93-8.71 4.39-11.68 7.51-5.89 6.17-8.49 14.54-7.67 22.38.7 6.69 3.92 13.09 9.09 17.82 3.49 3.2 7.85 5.56 12.99 6.6 5.33 1.07 11.01.69 19.31-.98 4.42-.89 8.56-2.22 12.5-4.55 3.9-2.3 7.24-5.37 9.85-9.11 2.62-3.75 4.31-7.92 5.24-12.35.96-4.57 1-8.7 1-13.26V64.46c.02-6.16-3.23-9.96-9.02-9.46z"
                style={{
                  fillRule: "evenodd",
                  clipRule: "evenodd",
                  fill: "#fff",
                }}
              />
            </svg>
          </div>
        )
      case 1:
        return (
          <div className="flex items-center justify-center">
            <svg
              viewBox="0 0 256 256"
              width="5em"
              height="5em"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid"
            >
              <path
                d="M128 0C57.308 0 0 57.309 0 128c0 70.696 57.309 128 128 128 70.697 0 128-57.304 128-128C256 57.314 198.697.007 127.998.007l.001-.006Zm58.699 184.614c-2.293 3.76-7.215 4.952-10.975 2.644-30.053-18.357-67.885-22.515-112.44-12.335a7.981 7.981 0 0 1-9.552-6.007 7.968 7.968 0 0 1 6-9.553c48.76-11.14 90.583-6.344 124.323 14.276 3.76 2.308 4.952 7.215 2.644 10.975Zm15.667-34.853c-2.89 4.695-9.034 6.178-13.726 3.289-34.406-21.148-86.853-27.273-127.548-14.92-5.278 1.594-10.852-1.38-12.454-6.649-1.59-5.278 1.386-10.842 6.655-12.446 46.485-14.106 104.275-7.273 143.787 17.007 4.692 2.89 6.175 9.034 3.286 13.72v-.001Zm1.345-36.293C162.457 88.964 94.394 86.71 55.007 98.666c-6.325 1.918-13.014-1.653-14.93-7.978-1.917-6.328 1.65-13.012 7.98-14.935C93.27 62.027 168.434 64.68 215.929 92.876c5.702 3.376 7.566 10.724 4.188 16.405-3.362 5.69-10.73 7.565-16.4 4.187h-.006Z"
                fill="#1ED760"
              />
            </svg>
          </div>
        )
      default:
        return null
    }
  }, [activeTab])

  const handleTabClick = (newTabId: number) => {
    if (newTabId !== activeTab && !isAnimating) {
      const newDirection = newTabId > activeTab ? 1 : -1
      setDirection(newDirection)
      setActiveTab(newTabId)
    }
  }

  const variants = {
    initial: (direction: number) => ({
      x: 300 * direction,
      opacity: 0,
      filter: "blur(4px)",
    }),
    active: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      x: -300 * direction,
      opacity: 0,
      filter: "blur(4px)",
    }),
  }

  return (
    <div className="flex flex-col items-center pt-4 ">
      <div className="flex space-x-1 border border-none rounded-[8px] cursor-pointer bg-neutral-700  px-[3px] py-[3.2px] shadow-inner-shadow">
        {tabs.map((tab, i) => (
          <button
            key={`${tab.id}-i-${i}`}
            onClick={() => handleTabClick(tab.id)}
            className={`${
              activeTab === tab.id ? "text-white " : "hover:text-neutral-300/60"
            } relative rounded-[5px] px-3 py-1.5 text-xs sm:text-sm font-medium text-neutral-600  transition focus-visible:outline-1 focus-visible:ring-1 focus-visible:ring-blue-light focus-visible:outline-none`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId="family-bubble"
                className="absolute inset-0 z-10 bg-neutral-800  mix-blend-difference shadow-inner-shadow"
                style={{ borderRadius: 5 }}
                transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
              />
            )}
            {tab.label}
          </button>
        ))}
      </div>
      <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
        <motion.div
          className="relative mx-auto my-[10px] w-[60px] md:w-[150px] overflow-hidden"
          initial={false}
          animate={{ height: bounds.height }}
        >
          <div className="md:p-6 p-2" ref={ref}>
            <AnimatePresence
              custom={direction}
              mode="popLayout"
              onExitComplete={() => setIsAnimating(false)}
            >
              <motion.div
                key={activeTab}
                variants={variants}
                initial="initial"
                animate="active"
                exit="exit"
                custom={direction}
                onAnimationStart={() => setIsAnimating(true)}
                onAnimationComplete={() => setIsAnimating(false)}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  )
}



https://www.cult-ui.com/docs/components/bg-animate-button

import { BgAnimateButton } from "../ui/bg-animate-button"

type Gradients =
  | "sunrise"
  | "ocean"
  | "candy"
  | "default"
  | "forest"
  | "sunset"
  | "nebula"

type Radius = "full" | "xl" | "2xl" | "3xl" | "sm"
type Animations = "spin" | "pulse" | "spin-slow" | "spin-fast"

const gradients: Gradients[] = [
  "sunrise",
  "ocean",
  "candy",
  "forest",
  "sunset",
  "default",
  "nebula",
]
const roundings: Radius[] = ["full", "xl", "2xl", "3xl", "sm"]
const animations: Animations[] = ["spin", "pulse", "spin-slow", "spin-fast"]

export const BgAnimateButtonsDemo = () => {
  return (
    <div className="w-full max-w-4xl">
      <div className=" sm:px-12 md:px-24 flex flex-col justify-center  rounded-lg space-y-4">
        {/* Roundings Grid */}

        <div className="grid grid-cols-3 gap-4">
          {roundings.slice(0, 2).map((rounding, i) => (
            <BgAnimateButton
              gradient={gradients[i + 1]}
              key={rounding}
              rounded={rounding}
            >
              {rounding}
            </BgAnimateButton>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {roundings.slice(2, 5).map((rounding, i) => (
            <BgAnimateButton
              gradient={gradients[i + 1]}
              key={rounding}
              rounded={rounding}
            >
              {rounding}
            </BgAnimateButton>
          ))}
        </div>

        {/* animations Grid */}
        <div className="grid grid-cols-2 gap-4">
          {animations.map((animations, i) => (
            <BgAnimateButton
              key={animations}
              gradient={gradients[i + 2]}
              variant="ghost"
              animation={animations}
            >
              {animations}
            </BgAnimateButton>
          ))}
        </div>
      </div>
    </div>
  )
}

export BgAnimateButtonsDemo



https://www.cult-ui.com/docs/components/expandable

"use client"

import React, { useState } from "react"
import {
  Battery,
  Bluetooth,
  Calendar,
  Clock,
  Cloud,
  Droplets,
  Fingerprint,
  MapPin,
  MessageSquare,
  Mic,
  ShoppingCart,
  Star,
  Sun,
  Users,
  Video,
  Wind,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Expandable,
  ExpandableCard,
  ExpandableCardContent,
  ExpandableCardFooter,
  ExpandableCardHeader,
  ExpandableContent,
  ExpandableTrigger,
} from "@/components/ui/expandable"

// _____________________EXAMPLES______________________
function DesignSyncExample() {
  return (
    <Expandable
      expandDirection="both"
      expandBehavior="replace"
      initialDelay={0.2}
      onExpandStart={() => console.log("Expanding meeting card...")}
      onExpandEnd={() => console.log("Meeting card expanded!")}
    >
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <ExpandableCard
            className="w-full relative"
            collapsedSize={{ width: 320, height: 240 }}
            expandedSize={{ width: 420, height: 480 }}
            hoverToExpand={false}
            expandDelay={200}
            collapseDelay={500}
          >
            <ExpandableCardHeader>
              <div className="flex justify-between items-start w-full">
                <div>
                  <Badge
                    variant="secondary"
                    className="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-100 mb-2"
                  >
                    In 15 mins
                  </Badge>
                  <h3 className="font-semibold text-xl text-gray-800 dark:text-white">
                    Design Sync
                  </h3>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline" className="h-8 w-8">
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to Calendar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </ExpandableCardHeader>

            <ExpandableCardContent>
              <div className="flex flex-col items-start justify-between mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>1:30PM → 2:30PM</span>
                </div>

                <ExpandableContent preset="blur-md">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>Conference Room A</span>
                  </div>
                </ExpandableContent>
              </div>
              <ExpandableContent preset="blur-md" stagger staggerChildren={0.2}>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                  Weekly design sync to discuss ongoing projects, share updates,
                  and address any design-related challenges.
                </p>
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-800 dark:text-gray-100 mb-2 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Attendees:
                  </h4>
                  <div className="flex -space-x-2 overflow-hidden">
                    {["Alice", "Bob", "Charlie", "David"].map((name, index) => (
                      <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="border-2 border-white dark:border-gray-800">
                              <AvatarImage
                                src={`/placeholder.svg?height=32&width=32&text=${name[0]}`}
                                alt={name}
                              />
                              <AvatarFallback>{name[0]}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <Video className="h-4 w-4 mr-2" />
                    Join Meeting
                  </Button>
                  {isExpanded && (
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open Chat
                    </Button>
                  )}
                </div>
              </ExpandableContent>
            </ExpandableCardContent>
            <ExpandableContent preset="slide-up">
              <ExpandableCardFooter>
                <div className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-300">
                  <span>Weekly</span>
                  <span>Next: Mon, 10:00 AM</span>
                </div>
              </ExpandableCardFooter>
            </ExpandableContent>
          </ExpandableCard>
        </ExpandableTrigger>
      )}
    </Expandable>
  )
}

export function ProductShowcaseCard() {
  return (
    <Expandable
      expandDirection="both"
      expandBehavior="replace"
      onExpandStart={() => console.log("Expanding product card...")}
      onExpandEnd={() => console.log("Product card expanded!")}
    >
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <ExpandableCard
            className="w-full relative"
            collapsedSize={{ width: 330, height: 220 }}
            expandedSize={{ width: 500, height: 520 }}
            hoverToExpand={false}
            expandDelay={500}
            collapseDelay={700}
          >
            <ExpandableCardHeader>
              <div className="flex justify-between items-center">
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  New Arrival
                </Badge>
                <Badge variant="outline" className="ml-2">
                  $129.99
                </Badge>
              </div>
            </ExpandableCardHeader>

            <ExpandableCardContent>
              <div className="flex items-start mb-4">
                <img
                  src="https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6505/6505727_rd.jpg;maxHeight=640;maxWidth=550;format=webp"
                  alt="Product"
                  className="object-cover rounded-md mr-4"
                  style={{
                    width: isExpanded ? "120px" : "80px",
                    height: isExpanded ? "120px" : "80px",
                    transition: "width 0.3s, height 0.3s",
                  }}
                />
                <div className="flex-1">
                  <h3
                    className="font-medium text-gray-800 dark:text-white tracking-tight transition-all duration-300"
                    style={{
                      fontSize: isExpanded ? "24px" : "18px",
                      fontWeight: isExpanded ? "700" : "400",
                    }}
                  >
                    Sony Headphones
                  </h3>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="w-4 h-4 text-yellow-400 fill-current"
                      />
                    ))}
                    <AnimatePresence mode="wait">
                      {isExpanded ? (
                        <motion.span
                          key="expanded"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-2 text-sm text-gray-600 dark:text-gray-400 overflow-hidden whitespace-nowrap"
                        >
                          (128 reviews)
                        </motion.span>
                      ) : (
                        <motion.span
                          key="collapsed"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-2 text-sm text-gray-600 dark:text-gray-400 overflow-hidden whitespace-nowrap"
                        >
                          (128)
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <ExpandableContent
                preset="fade"
                keepMounted={false}
                animateIn={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-xs">
                  Experience crystal-clear audio with our latest
                  noise-cancelling technology. Perfect for work, travel, or
                  relaxation.
                </p>

                <div className="space-y-4">
                  {[
                    { icon: Battery, text: "30-hour battery life" },
                    { icon: Bluetooth, text: "Bluetooth 5.0" },
                    { icon: Fingerprint, text: "Touch controls" },
                    { icon: Mic, text: "Voice assistant compatible" },
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm text-gray-600 dark:text-gray-400"
                    >
                      <feature.icon className="w-4 h-4 mr-2" />
                      <span>{feature.text}</span>
                    </div>
                  ))}

                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </ExpandableContent>
            </ExpandableCardContent>
            <ExpandableContent preset="slide-up">
              <ExpandableCardFooter>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 w-full">
                  <span>Free shipping</span>
                  <span>30-day return policy</span>
                </div>
              </ExpandableCardFooter>
            </ExpandableContent>
          </ExpandableCard>
        </ExpandableTrigger>
      )}
    </Expandable>
  )
}

export function WeatherForecastCard() {
  return (
    <Expandable expandDirection="both" expandBehavior="replace">
      <ExpandableTrigger>
        <ExpandableCard
          collapsedSize={{ width: 300, height: 220 }}
          expandedSize={{ width: 500, height: 420 }}
          hoverToExpand={false}
          expandDelay={100}
          collapseDelay={400}
        >
          <ExpandableCardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Sun className="w-8 h-8 text-yellow-400 mr-2" />
                <ExpandableContent preset="blur-sm" keepMounted={true}>
                  <h3 className="font-medium text-lg">Today's Weather</h3>
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    72°F
                  </Badge>
                </ExpandableContent>
              </div>
            </div>
          </ExpandableCardHeader>

          <ExpandableCardContent>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-2xl font-bold">72°F</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Feels like 75°F
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">Sunny</p>
                <ExpandableContent
                  preset="blur-sm"
                  stagger
                  staggerChildren={0.1}
                  keepMounted={true}
                  animateIn={{
                    initial: { opacity: 0, y: 20, rotate: -5 },
                    animate: { opacity: 1, y: 0, rotate: 0 },
                    transition: { type: "spring", stiffness: 300, damping: 20 },
                  }}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    High 78° / Low 65°
                  </p>
                </ExpandableContent>
              </div>
            </div>
            <ExpandableContent
              preset="blur-sm"
              stagger
              staggerChildren={0.1}
              keepMounted={true}
              animateIn={{
                initial: { opacity: 0, y: 20, rotate: -5 },
                animate: { opacity: 1, y: 0, rotate: 0 },
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
            >
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Cloud className="w-5 h-5 mr-2 text-gray-400" />
                    <span>Humidity</span>
                  </div>
                  <span>45%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Wind className="w-5 h-5 mr-2 text-gray-400" />
                    <span>Wind</span>
                  </div>
                  <span>8 mph</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Droplets className="w-5 h-5 mr-2 text-gray-400" />
                    <span>Precipitation</span>
                  </div>
                  <span>0%</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">5-Day Forecast</h4>
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => (
                  <div key={day} className="flex justify-between items-center">
                    <span>{day}</span>
                    <div className="flex items-center">
                      <Sun className="w-4 h-4 text-yellow-400 mr-2" />
                      <span>{70 + index}°F</span>
                    </div>
                  </div>
                ))}
              </div>
            </ExpandableContent>
          </ExpandableCardContent>
          <ExpandableCardFooter>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: 5 minutes ago
            </p>
          </ExpandableCardFooter>
        </ExpandableCard>
      </ExpandableTrigger>
    </Expandable>
  )
}

function ControlledExpandableCard() {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = () => {
    setIsExpanded((prev) => !prev)
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleToggle} className="mb-4">
        {isExpanded ? "Collapse" : "Expand"}
      </Button>

      <Expandable
        expanded={isExpanded}
        onToggle={handleToggle}
        expandDirection="vertical"
        expandBehavior="push"
        onExpandStart={() => toast.info("Expanding controlled card...")}
        onExpandEnd={() => toast.info("Controlled card expanded!")}
      >
        <ExpandableCard
          collapsedSize={{ width: 300, height: 100 }}
          expandedSize={{ width: 300, height: 300 }}
        >
          <ExpandableTrigger>
            <ExpandableCardHeader>
              <h3 className="text-lg font-semibold">
                Controlled Expandable Card
              </h3>
              <Badge variant="secondary">
                {isExpanded ? "Expanded" : "Collapsed"}
              </Badge>
            </ExpandableCardHeader>
          </ExpandableTrigger>
          <ExpandableCardContent>
            <p className="mb-4">
              This card's expanded state is controlled externally.
            </p>
            <ExpandableContent preset="fade" stagger staggerChildren={0.1}>
              <p className="mb-2">This content fades in when expanded.</p>
              <p className="mb-2">
                It uses staggered animation for child elements.
              </p>
              <p>The expansion is controlled by the button above.</p>
            </ExpandableContent>
          </ExpandableCardContent>
          <ExpandableCardFooter>
            <ExpandableContent preset="slide-up">
              <p className="text-sm text-gray-500">
                Footer content slides up when expanded
              </p>
            </ExpandableContent>
          </ExpandableCardFooter>
        </ExpandableCard>
      </Expandable>
    </div>
  )
}

export function ExpandableCardExamples() {
  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col items-center space-y-24">
        <div className="min-h-[480px]">
          <DesignSyncExample />
        </div>
        <div className="flex gap-24 min-h-[600px]">
          <ProductShowcaseCard />
          <WeatherForecastCard />
        </div>
        {/* <div>
        </div> */}
        {/* <div>
          <h2 className="text-xl font-semibold mb-4">Controlled Expandable</h2>
          <ControlledExpandableCard />
        </div> */}
      </div>
    </div>
  )
}



https://www.cult-ui.com/docs/components/minimal-card

import {
  MinimalCard,
  MinimalCardDescription,
  MinimalCardImage,
  MinimalCardTitle,
} from "@/components/ui/minimal-card"

export function MinimalCardDemo() {
  const cards = [
    {
      title: "Sick title",
      description:
        "How to design with gestures and motion that feel intuitive and natural.",
    },
    {
      title: "Sick title",
      description:
        "How to design with gestures and motion that feel intuitive and natural.",
    },
    {
      title: "Sick title",
      description:
        "How to design with gestures and motion that feel intuitive and natural.",
    },
    {
      title: "Sick title",
      description:
        "How to design with gestures and motion that feel intuitive and natural.",
    },
    {
      title: "Sick title",
      description:
        "How to design with gestures and motion that feel intuitive and natural.",
    },
  ]
  return (
    <div className="w-full max-w-4xl">
      <div className="min-h-[500px] p-4  flex flex-col justify-center  rounded-lg space-y-4">
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {cards.map((card) => (
            <MinimalCard>
              <MinimalCardImage src="/basic-img.png" alt={card.title} />
              <MinimalCardTitle>{card.title}</MinimalCardTitle>
              <MinimalCardDescription>
                {card.description}
              </MinimalCardDescription>
            </MinimalCard>
          ))}
        </div>
      </div>
    </div>
  )
}



https://www.cult-ui.com/docs/components/popover-form


"use client"

import { useEffect, useState } from "react"
import { Mail, Monitor, Moon, Sun } from "lucide-react"

import {
  PopoverForm,
  PopoverFormButton,
  PopoverFormCutOutLeftIcon,
  PopoverFormCutOutRightIcon,
  PopoverFormSeparator,
  PopoverFormSuccess,
} from "@/components/ui/popover-form"

type FormState = "idle" | "loading" | "success"

export function NewsletterSignupExample() {
  const [formState, setFormState] = useState<FormState>("idle")
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")

  function submit() {
    setFormState("loading")
    setTimeout(() => {
      setFormState("success")
    }, 1500)

    setTimeout(() => {
      setOpen(false)
      setFormState("idle")
      setEmail("")
    }, 3300)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex w-full items-center justify-center">
      <PopoverForm
        title="Newsletter Signup"
        open={open}
        setOpen={setOpen}
        width="320px"
        showCloseButton={formState !== "success"}
        showSuccess={formState === "success"}
        openChild={
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!email) return
              submit()
            }}
            className="p-4"
          >
            <div className="mb-4 space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border  rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Mail className=" text-muted-foreground size-4" />
                </div>
              </div>
              <p className="text-muted-foreground text-xs tracking-tight">
                Sick content to your mailbox every week!
              </p>
            </div>
            <PopoverFormButton
              loading={formState === "loading"}
              text="Subscribe"
            />
          </form>
        }
        successChild={
          <PopoverFormSuccess
            title="Successfully subscribed!"
            description="Thank you for joining our newsletter."
          />
        }
      />
    </div>
  )
}

type Theme = "light" | "dark" | "system"

export function ColorThemeSwitcherExample() {
  const [theme, setTheme] = useState<Theme>("system")
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(false)
  const themes: Theme[] = ["light", "dark", "system"]

  useEffect(() => {
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)")
    const updateSystemTheme = () => {
      setSystemTheme(systemPrefersDark.matches ? "dark" : "light")
    }

    updateSystemTheme()
    systemPrefersDark.addEventListener("change", updateSystemTheme)

    return () => {
      systemPrefersDark.removeEventListener("change", updateSystemTheme)
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    if (theme === "system") {
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme, systemTheme])

  return (
    <div className="flex w-full items-center justify-center">
      <PopoverForm
        showSuccess={false}
        title="Choose theme"
        open={open}
        setOpen={setOpen}
        width="200px"
        height="175px"
        showCloseButton={true}
        openChild={
          <div className="p-2">
            <h3 className="text-sm tracking-tight text-muted-foreground">
              Theme
            </h3>

            <div className="pt-2 space-y-2">
              {themes.map((t) => {
                const isSelected = theme === t
                const effectiveTheme = t === "system" ? systemTheme : t
                return (
                  < button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${isSelected
                      ? `bg-primary ${effectiveTheme === "light"
                        ? "text-white"
                        : "text-black"
                      }`
                      : ` hover:text-black hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white dark:text-white`
                      }`}
                  >
                    {t === "light" && <Sun className="mr-2 h-4 w-4" />}
                    {t === "dark" && <Moon className="mr-2 h-4 w-4 " />}
                    {t === "system" && <Monitor className="mr-2 h-4 w-4" />}
                    <span className="capitalize">{t}</span>
                  </button>
                )
              })}
            </div>
          </div>
        }
      />
    </div >
  )
}

export function FeedbackFormExample() {
  const [formState, setFormState] = useState<FormState>("idle")
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState("")

  function submit() {
    setFormState("loading")
    setTimeout(() => {
      setFormState("success")
    }, 1500)

    setTimeout(() => {
      setOpen(false)
      setFormState("idle")
      setFeedback("")
    }, 3300)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter" &&
        open &&
        formState === "idle"
      ) {
        submit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, formState])

  return (
    <div className="flex w-full items-center justify-center">
      <PopoverForm
        title="Feedback"
        open={open}
        setOpen={setOpen}
        width="364px"
        height="192px"
        showCloseButton={formState !== "success"}
        showSuccess={formState === "success"}
        openChild={
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!feedback) return
              submit()
            }}
            className=""
          >
            <div className="relative">
              <textarea
                autoFocus
                placeholder="Feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="h-32 w-full resize-none rounded-t-lg p-3 text-sm outline-none"
                required
              />
            </div>
            <div className="relative flex h-12 items-center px-[10px]">
              <PopoverFormSeparator />
              <div className="absolute left-0 top-0 -translate-x-[1.5px] -translate-y-1/2">
                <PopoverFormCutOutLeftIcon />
              </div>
              <div className="absolute right-0 top-0 translate-x-[1.5px] -translate-y-1/2 rotate-180">
                <PopoverFormCutOutRightIcon />
              </div>
              <PopoverFormButton
                loading={formState === "loading"}
                text="Submit"
              />
            </div>
          </form>
        }
        successChild={
          <PopoverFormSuccess
            title="Feedback Received"
            description="Thank you for supporting our project!"
          />
        }
      />
    </div>
  )
}

export function ContactFormExample() {
  const [formState, setFormState] = useState<FormState>("idle")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  function submit() {
    setFormState("loading")
    setTimeout(() => {
      setFormState("success")
    }, 1500)

    setTimeout(() => {
      setOpen(false)
      setFormState("idle")
      setName("")
      setEmail("")
      setMessage("")
    }, 3300)
  }

  return (
    <div className="flex  w-full items-center justify-center">
      <PopoverForm
        title="Click Here"
        open={open}
        setOpen={setOpen}
        width="364px"
        height="372px"
        showCloseButton={formState !== "success"}
        showSuccess={formState === "success"}
        openChild={
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!name || !email || !message) return
              submit()
            }}
            className=" space-y-4"
          >
            <div className="px-4 pt-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border  rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-black"
                required
              />
            </div>
            <div className="px-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border  rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-black"
                required
              />
            </div>
            <div className="px-4">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-black"
                rows={3}
                required
              />
            </div>
            <div className="relative flex h-12 items-center px-[10px]">
              <PopoverFormSeparator />
              <div className="absolute left-0 top-0 -translate-x-[1.5px] -translate-y-1/2">
                <PopoverFormCutOutLeftIcon />
              </div>
              <div className="absolute right-0 top-0 translate-x-[1.5px] -translate-y-1/2 rotate-180">
                <PopoverFormCutOutRightIcon />
              </div>
              <PopoverFormButton
                loading={formState === "loading"}
                text="Submit"
              />
            </div>
          </form>
        }
        successChild={
          <PopoverFormSuccess
            title="Message Sent"
            description="Thank you for contacting us. We'll get back to you soon!"
          />
        }
      />
    </div>
  )
}

export function PopoverFormExamples() {
  return (
    <div className="space-y-8 grid grid-cols-1 ">
      <FeedbackFormExample />
      <ContactFormExample />
      <NewsletterSignupExample />
      <ColorThemeSwitcherExample />
    </div>
  )
}


https://www.cult-ui.com/docs/components/sortable-list


"use client"

import { useCallback, useState } from "react"
import { Plus, RepeatIcon, Settings2Icon, XIcon } from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs"

import SortableList, { Item, SortableListItem } from "../ui/sortable-list"

const initialState = [
  {
    text: "Gather Data",
    checked: false,
    id: 1,
    description:
      "Collect relevant marketing copy from the user's website and competitor sites to understand the current market positioning and identify potential areas for improvement.",
  },
  {
    text: "Analyze Copy",
    checked: false,
    id: 2,
    description:
      "As an AI language model, analyze the collected marketing copy for clarity, persuasiveness, and alignment with the user's brand voice and target audience. Identify strengths, weaknesses, and opportunities for optimization.",
  },
  {
    text: "Create Suggestions",
    checked: false,
    id: 3,
    description:
      "Using natural language generation techniques, create alternative versions of the marketing copy that address the identified weaknesses and leverage the opportunities for improvement. Ensure the generated copy is compelling, on-brand, and optimized for the target audience.",
  },
  {
    text: "Recommendations",
    checked: false,
    id: 5,
    description:
      "Present the AI-generated marketing copy suggestions to the user, along with insights on why these changes were recommended. Provide a user-friendly interface for the user to review, edit, and implement the optimized copy on their website.",
  },
]

function SortableListDemo() {
  const [items, setItems] = useState<Item[]>(initialState)
  const [openItemId, setOpenItemId] = useState<number | null>(null)
  const [tabChangeRerender, setTabChangeRerender] = useState<number>(1)
  const [topP, setTopP] = useState([10])
  const [temp, setTemp] = useState([10])
  const [tokens, setTokens] = useState([10])

  const handleCompleteItem = (id: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }

  const handleAddItem = () => {
    setItems((prevItems) => [
      ...prevItems,
      {
        text: `Item ${prevItems.length + 1}`,
        checked: false,
        id: Date.now(),
        description: "",
      },
    ])
  }

  const handleResetItems = () => {
    setItems(initialState)
  }

  const handleCloseOnDrag = useCallback(() => {
    setItems((prevItems) => {
      const updatedItems = prevItems.map((item) =>
        item.checked ? { ...item, checked: false } : item
      )
      return updatedItems.some(
        (item, index) => item.checked !== prevItems[index].checked
      )
        ? updatedItems
        : prevItems
    })
  }, [])

  const renderListItem = (
    item: Item,
    order: number,
    onCompleteItem: (id: number) => void,
    onRemoveItem: (id: number) => void
  ) => {
    const isOpen = item.id === openItemId

    const tabs = [
      {
        id: 0,
        label: "Title",
        content: (
          <div className="flex w-full flex-col pr-2 py-2">
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{
                type: "spring",
                bounce: 0.2,
                duration: 0.75,
                delay: 0.15,
              }}
            >
              <label className="text-xs text-neutral-400">
                Short title for your agent task
              </label>
              <motion.input
                type="text"
                value={item.text}
                className=" w-full rounded-lg border font-semibold border-black/10 bg-neutral-800 px-1 py-[6px] text-xl md:text-3xl text-white placeholder:text-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13EEE3]/80 dark:border-white/10"
                onChange={(e) => {
                  const text = e.target.value
                  setItems((prevItems) =>
                    prevItems.map((i) =>
                      i.id === item.id ? { ...i, text } : i
                    )
                  )
                }}
              />
            </motion.div>
          </div>
        ),
      },
      {
        id: 1,
        label: "Prompt",
        content: (
          <div className="flex flex-col  pr-2 ">
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{
                type: "spring",
                bounce: 0.2,
                duration: 0.75,
                delay: 0.15,
              }}
            >
              <label className="text-xs text-neutral-400" htmlFor="prompt">
                Prompt{" "}
                <span className="lowercase">
                  instructing your agent how to {item.text.slice(0, 20)}
                </span>
              </label>
              <textarea
                id="prompt"
                className="h-[100px] w-full resize-none rounded-[6px]  bg-neutral-800 px-2 py-[2px] text-sm text-white placeholder:text-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13EEE3]/80"
                value={item.description}
                placeholder="update agent prompt"
                onChange={(e) => {
                  const description = e.target.value
                  setItems((prevItems) =>
                    prevItems.map((i) =>
                      i.id === item.id ? { ...i, description } : i
                    )
                  )
                }}
              />
            </motion.div>
          </div>
        ),
      },
      {
        id: 2,
        label: "Settings",
        content: (
          <div className="flex flex-col py-2 px-1 ">
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{
                type: "spring",
                bounce: 0.2,
                duration: 0.75,
                delay: 0.15,
              }}
              className="space-y-3"
            >
              <p className="text-xs text-neutral-400">
                AI settings for the{" "}
                <span className="lowercase">
                  {item.text.slice(0, 20)} stage
                </span>
              </p>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400" htmlFor="top-p">
                    Top P
                  </label>
                  <div className="flex w-1/2 items-center gap-3">
                    <span className="w-12 rounded-md  bg-black/20 px-2 py-0.5 text-right text-sm text-muted-foreground">
                      {topP}
                    </span>
                    <Slider
                      id="temperature"
                      max={1}
                      defaultValue={topP}
                      step={0.1}
                      onValueChange={setTopP}
                      className="[&_[role=slider]]:h-8 [&_[role=slider]]:w-5 [&_[role=slider]]:rounded-md [&_[role=slider]]:border-neutral-100/10 [&_[role=slider]]:bg-neutral-900 [&_[role=slider]]:hover:border-[#13EEE3]/70 "
                      aria-label="Top P"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400" htmlFor="top-p">
                    Temperature
                  </label>
                  <div className="flex w-1/2 items-center gap-3">
                    <span className="w-12 rounded-md  bg-black/20 px-2 py-0.5 text-right text-sm text-muted-foreground">
                      {temp}
                    </span>
                    <Slider
                      id="top-p"
                      max={1}
                      defaultValue={temp}
                      step={0.1}
                      onValueChange={setTemp}
                      className="[&_[role=slider]]:h-8 [&_[role=slider]]:w-5 [&_[role=slider]]:rounded-md [&_[role=slider]]:border-neutral-100/10 [&_[role=slider]]:bg-neutral-900 [&_[role=slider]]:hover:border-[#13EEE3]/70"
                      aria-label="Temperature"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400" htmlFor="top-p">
                    Max Tokens
                  </label>
                  <div className="flex w-1/2 items-center gap-3">
                    <span className="w-12 rounded-md  bg-black/20 px-2 py-0.5 text-right text-sm text-muted-foreground">
                      {tokens}
                    </span>
                    <Slider
                      id="max_tokens"
                      max={1}
                      defaultValue={tokens}
                      step={0.1}
                      onValueChange={setTokens}
                      className="[&_[role=slider]]:h-8 [&_[role=slider]]:w-5 [&_[role=slider]]:rounded-md [&_[role=slider]]:border-neutral-100/10 [&_[role=slider]]:bg-neutral-900 [&_[role=slider]]:hover:border-[#13EEE3]/70"
                      aria-label="Tokens"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ),
      },
    ]

    return (
      <SortableListItem
        item={item}
        order={order}
        key={item.id}
        isExpanded={isOpen}
        onCompleteItem={onCompleteItem}
        onRemoveItem={onRemoveItem}
        handleDrag={handleCloseOnDrag}
        className="my-2 "
        renderExtra={(item) => (
          <div
            key={`${isOpen}`}
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-2 ",
              isOpen ? "py-1 px-1" : "py-3 "
            )}
          >
            <motion.button
              layout
              onClick={() => setOpenItemId(!isOpen ? item.id : null)}
              key="collapse"
              className={cn(
                isOpen
                  ? "absolute right-3 top-3 z-10 "
                  : "relative z-10 ml-auto mr-3 "
              )}
            >
              {isOpen ? (
                <motion.span
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{
                    type: "spring",
                    duration: 1.95,
                  }}
                >
                  <XIcon className="h-5 w-5 text-neutral-500" />
                </motion.span>
              ) : (
                <motion.span
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{
                    type: "spring",
                    duration: 0.95,
                  }}
                >
                  <Settings2Icon className="stroke-1 h-5 w-5 text-white/80  hover:stroke-[#13EEE3]/70 " />
                </motion.span>
              )}
            </motion.button>

            <LayoutGroup id={`${item.id}`}>
              <AnimatePresence mode="popLayout">
                {isOpen ? (
                  <motion.div className="flex w-full flex-col ">
                    <div className=" w-full  ">
                      <motion.div
                        initial={{
                          y: 0,
                          opacity: 0,
                          filter: "blur(4px)",
                        }}
                        animate={{
                          y: 0,
                          opacity: 1,
                          filter: "blur(0px)",
                        }}
                        transition={{
                          type: "spring",
                          duration: 0.15,
                        }}
                        layout
                        className="  w-full"
                      >
                        <DirectionAwareTabs
                          className="mr-auto bg-transparent pr-2"
                          rounded="rounded "
                          tabs={tabs}
                          onChange={() =>
                            setTabChangeRerender(tabChangeRerender + 1)
                          }
                        />
                      </motion.div>
                    </div>

                    <motion.div
                      key={`re-render-${tabChangeRerender}`} //  re-animates the button section on tab change
                      className="mb-2 flex w-full items-center justify-between pl-2"
                      initial={{ opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{
                        type: "spring",
                        bounce: 0,
                        duration: 0.55,
                      }}
                    >
                      <motion.div className="flex items-center gap-2 pt-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#13EEE3]" />
                        <span className="text-xs text-neutral-300/80">
                          Changes
                        </span>
                      </motion.div>
                      <motion.div layout className="ml-auto mr-1  pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setOpenItemId(null)
                            toast.info("Changes saved")
                          }}
                          className="h-7 rounded-lg bg-[#13EEE3]/80 hover:bg-[#13EEE3] hover:text-black text-black"
                        >
                          Apply Changes
                        </Button>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        )}
      />
    )
  }

  return (
    <div className="md:px-4 w-full max-w-xl ">
      <div className="mb-9 rounded-2xl  p-2 shadow-sm md:p-6 dark:bg-[#151515]/50 bg-black">
        <div className=" overflow-auto p-1  md:p-4">
          <div className="flex flex-col space-y-2">
            <div className="">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="256"
                height="260"
                preserveAspectRatio="xMidYMid"
                viewBox="0 0 256 260"
                className="h-6 w-6 fill-neutral-500 "
              >
                <path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
              </svg>
              <h3 className="text-neutral-200">Agent workflow</h3>
              <a
                className="text-xs text-white/80"
                href="https://www.uilabs.dev/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Inspired by <span className="text-[#13EEE3]"> @mrncst</span>
              </a>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <button disabled={items?.length > 5} onClick={handleAddItem}>
                <Plus className="dark:text-netural-100 h-5 w-5 text-neutral-500/80 hover:text-white/80" />
              </button>
              <div data-tip="Reset task list">
                <button onClick={handleResetItems}>
                  <RepeatIcon className="dark:text-netural-100 h-4 w-4 text-neutral-500/80 hover:text-white/80" />
                </button>
              </div>
            </div>
            <SortableList
              items={items}
              setItems={setItems}
              onCompleteItem={handleCompleteItem}
              renderItem={renderListItem}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export SortableListDemo


https://www.cult-ui.com/docs/components/three-d-carousel

import ThreeDPhotoCarousel from "../ui/three-d-carousel"

export function ThreeDPhotoCarouselDemo() {
  return (
    <div className="w-full max-w-4xl">
      <div className="min-h-[500px]  flex flex-col justify-center border border-dashed rounded-lg space-y-4">
        <div className="p-2">
          <ThreeDPhotoCarousel />
        </div>
      </div>
    </div>
  )
}


https://nyxbui.design/docs/components/animated-list

"use client"

import { ny } from "~/lib/utils"
import { AnimatedList } from "~/components/ui/animated-list"

interface Item {
   name: string
   description: string
   icon: string
   color: string
   time: string
}

let notifications = [
   {
      name: "Payment received",
      description: "Nyxb UI",
      time: "15m ago",

      icon: "💸",
      color: "#00C9A7",
   },
   {
      name: "User signed up",
      description: "Nyxb UI",
      time: "10m ago",
      icon: "👤",
      color: "#FFB800",
   },
   {
      name: "New message",
      description: "Nyxb UI",
      time: "5m ago",
      icon: "💬",
      color: "#FF3D71",
   },
   {
      name: "New event",
      description: "Nyxb UI",
      time: "2m ago",
      icon: "🗞️",
      color: "#1E86FF",
   },
]

notifications = Array.from({ length: 10 }, () => notifications).flat()

function Notification({ name, description, icon, color, time }: Item) {
   return (
      <figure
         className={ny(
            "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-4",
            // animation styles
            "transition-all duration-200 ease-in-out hover:scale-[103%]",
            // light styles
            "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
            // dark styles
            "transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
         )}
      >
         <div className="flex flex-row items-center gap-3">
            <div
               className="flex size-10 items-center justify-center rounded-2xl"
               style={{
                  backgroundColor: color,
               }}
            >
               <span className="text-lg">{icon}</span>
            </div>
            <div className="flex flex-col overflow-hidden">
               <figcaption className="flex flex-row items-center whitespace-pre text-lg font-medium dark:text-white ">
                  <span className="text-sm sm:text-lg">{name}</span>
                  <span className="mx-1">·</span>
                  <span className="text-xs text-gray-500">{time}</span>
               </figcaption>
               <p className="text-sm font-normal dark:text-white/60">
                  {description}
               </p>
            </div>
         </div>
      </figure>
   )
}

export function AnimatedListDemo() {
   return (
      <div className="bg-background relative flex max-h-[400px] min-h-[400px] w-full max-w-lg flex-col overflow-hidden rounded-lg border p-6 shadow-lg">
         <AnimatedList>
            {notifications.map((item, idx) => (
               <Notification {...item} key={idx} />
            ))}
         </AnimatedList>
      </div>
   )
}


https://nyxbui.design/docs/components/confetti

"use client"

import { useRef } from "react"
import type { ConfettiRef } from "~/components/ui/confetti"
import Confetti from "~/components/ui/confetti"

export function ConfettiBasicCannon() {
   const confettiRef = useRef<ConfettiRef>(null)

   return (
      <div className="bg-background relative flex h-[500px] w-full max-w-lg flex-col items-center justify-center overflow-hidden rounded-lg border md:shadow-xl">
         <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
            Confetti
         </span>

         <Confetti
            ref={confettiRef}
            className="absolute left-0 top-0 z-0 size-full"
            onMouseEnter={() => {
               confettiRef.current?.fire({})
            }}
         />
      </div>
   )
}


https://nyxbui.design/docs/components/blur-fade

import BlurFade from "~/components/ui/blur-fade"

const images = Array.from({ length: 9 }, (_, i) => {
   const isLandscape = i % 2 === 0
   const width = isLandscape ? 800 : 600
   const height = isLandscape ? 600 : 800
   return `https://picsum.photos/seed/${i + 1}/${width}/${height}`
})

export function BlurFadeDemo() {
   return (
      <section id="photos">
         <div className="columns-2 gap-4 sm:columns-3">
            {images.map((imageUrl, idx) => (
               <BlurFade key={imageUrl} delay={0.25 + idx * 0.05} inView>
                  <img
                     className="mb-4 size-full rounded-lg object-contain"
                     src={imageUrl}
                     alt={`Random stock image ${idx + 1}`}
                  />
               </BlurFade>
            ))}
         </div>
      </section>
   )
}


https://nyxbui.design/docs/components/text-animate

import { TextAnimate } from "~/components/ui/text-animate"

export function TextAnimateDemo() {
   return (
      <TextAnimate animation="blurInUp" by="character">
         Blur in by character
      </TextAnimate>
   )
}


https://nyxbui.design/docs/components/animated-shiny-text

import { ArrowRightIcon } from "@radix-ui/react-icons"
import { ny } from "~/lib/utils"
import AnimatedShinyText from "~/components/ui/animated-shiny-text"

export async function AnimatedShinyTextDemo() {
   return (
      <div className="z-10 flex min-h-64 items-center justify-center">
         <div
            className={ny(
               "group rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800",
            )}
         >
            <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
               <span>✨ Introducing Nyxb UI</span>
               <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
            </AnimatedShinyText>
         </div>
      </div>
   )
}


https://nyxbui.design/docs/components/animated-gradient-text

import { ChevronRight } from "lucide-react"
import { ny } from "~/lib/utils"
import AnimatedGradientText from "~/components/ui/animated-gradient-text"

export async function AnimatedGradientTextDemo() {
   return (
      <div className="z-10 flex min-h-64 items-center justify-center">
         <AnimatedGradientText>
            🎉 <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300" />{" "}
            <span
               className={ny(
                  `animate-gradient inline bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
               )}
            >
               Introducing Nyxb UI
            </span>
            <ChevronRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
         </AnimatedGradientText>
      </div>
   )
}


https://nyxbui.design/docs/components/shimmer-button

import ShimmerButton from "~/components/ui/shimmer-button"

export function ShimmerButtonDemo() {
   return (
      <div className="z-10 flex min-h-64 items-center justify-center">
         <ShimmerButton className="shadow-2xl">
            <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg dark:from-white dark:to-slate-900/10">
               Shimmer Button
            </span>
         </ShimmerButton>
      </div>
   )
}


https://nyxbui.design/docs/components/shiny-button

import ShinyButton from "~/components/ui/shiny-button"

export function ShinyButtonDemo() {
   return <ShinyButton text="Shiny Button" />
}



https://nyxbui.design/docs/components/ripple-button

import { RippleButton } from "~/components/ui/ripple-button"

export function RippleButtonDemo() {
   return <RippleButton rippleColor="#ADD8E6">Click me</RippleButton>
}



https://nyxbui.design/docs/components/warp-background
import {
   Card,
   CardContent,
   CardDescription,
   CardTitle,
} from "~/components/ui/card"
import { WarpBackground } from "~/components/ui/warp-background"

export function ExampleComponentDemo() {
   return (
      <WarpBackground>
         <Card className="w-80">
            <CardContent className="flex flex-col gap-2 p-4">
               <CardTitle>Congratulations on Your Promotion!</CardTitle>
               <CardDescription>
                  Your hard work and dedication have paid off. We&apos;re
                  thrilled to see you take this next step in your career. Keep
                  up the fantastic work!
               </CardDescription>
            </CardContent>
         </Card>
      </WarpBackground>
   )
}


https://magicui.design/docs/components/bento-grid

import { CalendarIcon, FileTextIcon } from "@radix-ui/react-icons";
import { BellIcon, Share2Icon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import AnimatedBeamMultipleOutputDemo from "@/registry/example/animated-beam-multiple-outputs";
import AnimatedListDemo from "@/registry/example/animated-list-demo";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import { Marquee } from "@/components/magicui/marquee";

const files = [
  {
    name: "bitcoin.pdf",
    body: "Bitcoin is a cryptocurrency invented in 2008 by an unknown person or group of people using the name Satoshi Nakamoto.",
  },
  {
    name: "finances.xlsx",
    body: "A spreadsheet or worksheet is a file made of rows and columns that help sort data, arrange data easily, and calculate numerical data.",
  },
  {
    name: "logo.svg",
    body: "Scalable Vector Graphics is an Extensible Markup Language-based vector image format for two-dimensional graphics with support for interactivity and animation.",
  },
  {
    name: "keys.gpg",
    body: "GPG keys are used to encrypt and decrypt email, files, directories, and whole disk partitions and to authenticate messages.",
  },
  {
    name: "seed.txt",
    body: "A seed phrase, seed recovery phrase or backup seed phrase is a list of words which store all the information needed to recover Bitcoin funds on-chain.",
  },
];

const features = [
  {
    Icon: FileTextIcon,
    name: "Save your files",
    description: "We automatically save your files as you type.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-1",
    background: (
      <Marquee
        pauseOnHover
        className="absolute top-10 [--duration:20s] [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] "
      >
        {files.map((f, idx) => (
          <figure
            key={idx}
            className={cn(
              "relative w-32 cursor-pointer overflow-hidden rounded-xl border p-4",
              "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
              "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
              "transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none",
            )}
          >
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col">
                <figcaption className="text-sm font-medium dark:text-white ">
                  {f.name}
                </figcaption>
              </div>
            </div>
            <blockquote className="mt-2 text-xs">{f.body}</blockquote>
          </figure>
        ))}
      </Marquee>
    ),
  },
  {
    Icon: BellIcon,
    name: "Notifications",
    description: "Get notified when something happens.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: (
      <AnimatedListDemo className="absolute right-2 top-4 h-[300px] w-full scale-75 border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-90" />
    ),
  },
  {
    Icon: Share2Icon,
    name: "Integrations",
    description: "Supports 100+ integrations and counting.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: (
      <AnimatedBeamMultipleOutputDemo className="absolute right-2 top-4 h-[300px] border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-105" />
    ),
  },
  {
    Icon: CalendarIcon,
    name: "Calendar",
    description: "Use the calendar to filter your files by date.",
    className: "col-span-3 lg:col-span-1",
    href: "#",
    cta: "Learn more",
    background: (
      <Calendar
        mode="single"
        selected={new Date(2022, 4, 11, 0, 0, 0)}
        className="absolute right-0 top-10 origin-top scale-75 rounded-md border transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:scale-90"
      />
    ),
  },
];

export function BentoDemo() {
  return (
    <BentoGrid>
      {features.map((feature, idx) => (
        <BentoCard key={idx} {...feature} />
      ))}
    </BentoGrid>
  );
}



https://magicui.design/docs/components/border-beam

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BorderBeam } from "@/components/magicui/border-beam";

export function Component() {
  return (
    <Card className="relative w-[350px] overflow-hidden">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your credentials to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Register</Button>
        <Button>Login</Button>
      </CardFooter>
      <BorderBeam duration={8} size={100} />
    </Card>
  );
}


https://magicui.design/docs/components/shine-border
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShineBorder } from "@/components/magicui/shine-border";

export function ShineBorderDemo() {
  return (
    <Card className="relative overflow-hidden max-w-[350px] w-full">
      <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Sign In</Button>
      </CardFooter>
    </Card>
  );
}


https://magicui.design/docs/components/rainbow-button
import { RainbowButton } from "@/components/magicui/rainbow-button";

export function RainbowButtonDemo() {
  return <RainbowButton>Get Unlimited Access</RainbowButton>;
}



https://rombo.co/tailwind/




https://animata.design/docs/button/ai-button

import { useEffect, useMemo, useState } from "react";
import { Sparkle } from "lucide-react";
import { loadFull } from "tsparticles";

import type { ISourceOptions } from "@tsparticles/engine";
import Particles, { initParticlesEngine } from "@tsparticles/react";

const options: ISourceOptions = {
  key: "star",
  name: "Star",
  particles: {
    number: {
      value: 20,
      density: {
        enable: false,
      },
    },
    color: {
      value: ["#7c3aed", "#bae6fd", "#a78bfa", "#93c5fd", "#0284c7", "#fafafa", "#38bdf8"],
    },
    shape: {
      type: "star",
      options: {
        star: {
          sides: 4,
        },
      },
    },
    opacity: {
      value: 0.8,
    },
    size: {
      value: { min: 1, max: 4 },
    },
    rotate: {
      value: {
        min: 0,
        max: 360,
      },
      enable: true,
      direction: "clockwise",
      animation: {
        enable: true,
        speed: 10,
        sync: false,
      },
    },
    links: {
      enable: false,
    },
    reduceDuplicates: true,
    move: {
      enable: true,
      center: {
        x: 120,
        y: 45,
      },
    },
  },
  interactivity: {
    events: {},
  },
  smooth: true,
  fpsLimit: 120,
  background: {
    color: "transparent",
    size: "cover",
  },
  fullScreen: {
    enable: false,
  },
  detectRetina: true,
  absorbers: [
    {
      enable: true,
      opacity: 0,
      size: {
        value: 1,
        density: 1,
        limit: {
          radius: 5,
          mass: 5,
        },
      },
      position: {
        x: 110,
        y: 45,
      },
    },
  ],
  emitters: [
    {
      autoPlay: true,
      fill: true,
      life: {
        wait: true,
      },
      rate: {
        quantity: 5,
        delay: 0.5,
      },
      position: {
        x: 110,
        y: 45,
      },
    },
  ],
};

export default function AiButton() {
  const [particleState, setParticlesReady] = useState<"loaded" | "ready">();
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadFull(engine);
    }).then(() => {
      setParticlesReady("loaded");
    });
  }, []);

  const modifiedOptions = useMemo(() => {
    options.autoPlay = isHovering;
    return options;
  }, [isHovering]);

  return (
    <button
      className="group relative my-8 rounded-full bg-gradient-to-r from-blue-300/30 via-blue-500/30 via-40% to-purple-500/30 p-1 text-white transition-transform hover:scale-110 active:scale-105"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-300 via-blue-500 via-40% to-purple-500 px-4 py-2 text-white">
        <Sparkle className="size-6 -translate-y-0.5 animate-sparkle fill-white" />
        <Sparkle
          style={{
            animationDelay: "1s",
          }}
          className="absolute bottom-2.5 left-3.5 z-20 size-2 rotate-12 animate-sparkle fill-white"
        />
        <Sparkle
          style={{
            animationDelay: "1.5s",
            animationDuration: "2.5s",
          }}
          className="absolute left-5 top-2.5 size-1 -rotate-12 animate-sparkle fill-white"
        />
        <Sparkle
          style={{
            animationDelay: "0.5s",
            animationDuration: "2.5s",
          }}
          className="absolute left-3 top-3 size-1.5 animate-sparkle fill-white"
        />

        <span className="font-semibold">Generate thumbnails</span>
      </div>
      {!!particleState && (
        <Particles
          id="whatever"
          className={`pointer-events-none absolute -bottom-4 -left-4 -right-4 -top-4 z-0 opacity-0 transition-opacity ${particleState === "ready" ? "group-hover:opacity-100" : ""}`}
          particlesLoaded={async () => {
            setParticlesReady("ready");
          }}
          options={modifiedOptions}
        />
      )}
    </button>
  );
}




https://ui.aceternity.com/components/animated-modal

"use client";
import React from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "../ui/animated-modal";

import { motion } from "motion/react";

export function AnimatedModalDemo() {
  const images = [
    "https://images.unsplash.com/photo-1517322048670-4fba75cbbb62?q=80&w=3000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1573790387438-4da905039392?q=80&w=3425&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1554931670-4ebfabf6e7a9?q=80&w=3387&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1546484475-7f7bd55792da?q=80&w=2581&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  ];
  return (
    <div className="py-40  flex items-center justify-center">
      <Modal>
        <ModalTrigger className="bg-black dark:bg-white dark:text-black text-white flex justify-center group/modal-btn">
          <span className="group-hover/modal-btn:translate-x-40 text-center transition duration-500">
            Book your flight
          </span>
          <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex items-center justify-center absolute inset-0 transition duration-500 text-white z-20">
            ✈️
          </div>
        </ModalTrigger>
        <ModalBody>
          <ModalContent>
            <h4 className="text-lg md:text-2xl text-neutral-600 dark:text-neutral-100 font-bold text-center mb-8">
              Book your trip to{" "}
              <span className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700 border border-gray-200">
                Bali
              </span>{" "}
              now! ✈️
            </h4>
            <div className="flex justify-center items-center">
              {images.map((image, idx) => (
                <motion.div
                  key={"images" + idx}
                  style={{
                    rotate: Math.random() * 20 - 10,
                  }}
                  whileHover={{
                    scale: 1.1,
                    rotate: 0,
                    zIndex: 100,
                  }}
                  whileTap={{
                    scale: 1.1,
                    rotate: 0,
                    zIndex: 100,
                  }}
                  className="rounded-xl -mr-4 mt-4 p-1 bg-white dark:bg-neutral-800 dark:border-neutral-700 border border-neutral-100 shrink-0 overflow-hidden"
                >
                  <img
                    src={image}
                    alt="bali images"
                    width="500"
                    height="500"
                    className="rounded-lg h-20 w-20 md:h-40 md:w-40 object-cover shrink-0"
                  />
                </motion.div>
              ))}
            </div>
            <div className="py-10 flex flex-wrap gap-x-4 gap-y-6 items-start justify-start max-w-sm mx-auto">
              <div className="flex  items-center justify-center">
                <PlaneIcon className="mr-1 text-neutral-700 dark:text-neutral-300 h-4 w-4" />
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                  5 connecting flights
                </span>
              </div>
              <div className="flex items-center justify-center">
                <ElevatorIcon className="mr-1 text-neutral-700 dark:text-neutral-300 h-4 w-4" />
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                  12 hotels
                </span>
              </div>
              <div className="flex items-center justify-center">
                <VacationIcon className="mr-1 text-neutral-700 dark:text-neutral-300 h-4 w-4" />
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                  69 visiting spots
                </span>
              </div>
              <div className="flex  items-center justify-center">
                <FoodIcon className="mr-1 text-neutral-700 dark:text-neutral-300 h-4 w-4" />
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                  Good food everyday
                </span>
              </div>
              <div className="flex items-center justify-center">
                <MicIcon className="mr-1 text-neutral-700 dark:text-neutral-300 h-4 w-4" />
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                  Open Mic
                </span>
              </div>
              <div className="flex items-center justify-center">
                <ParachuteIcon className="mr-1 text-neutral-700 dark:text-neutral-300 h-4 w-4" />
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                  Paragliding
                </span>
              </div>
            </div>
          </ModalContent>
          <ModalFooter className="gap-4">
            <button className="px-2 py-1 bg-gray-200 text-black dark:bg-black dark:border-black dark:text-white border border-gray-300 rounded-md text-sm w-28">
              Cancel
            </button>
            <button className="bg-black text-white dark:bg-white dark:text-black text-sm px-2 py-1 rounded-md border border-black w-28">
              Book Now
            </button>
          </ModalFooter>
        </ModalBody>
      </Modal>
    </div>
  );
}

const PlaneIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3z" />
    </svg>
  );
};

const VacationIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M17.553 16.75a7.5 7.5 0 0 0 -10.606 0" />
      <path d="M18 3.804a6 6 0 0 0 -8.196 2.196l10.392 6a6 6 0 0 0 -2.196 -8.196z" />
      <path d="M16.732 10c1.658 -2.87 2.225 -5.644 1.268 -6.196c-.957 -.552 -3.075 1.326 -4.732 4.196" />
      <path d="M15 9l-3 5.196" />
      <path d="M3 19.25a2.4 2.4 0 0 1 1 -.25a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 1 .25" />
    </svg>
  );
};

const ElevatorIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 4m0 1a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z" />
      <path d="M10 10l2 -2l2 2" />
      <path d="M10 14l2 2l2 -2" />
    </svg>
  );
};

const FoodIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M20 20c0 -3.952 -.966 -16 -4.038 -16s-3.962 9.087 -3.962 14.756c0 -5.669 -.896 -14.756 -3.962 -14.756c-3.065 0 -4.038 12.048 -4.038 16" />
    </svg>
  );
};

const MicIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M15 12.9a5 5 0 1 0 -3.902 -3.9" />
      <path d="M15 12.9l-3.902 -3.899l-7.513 8.584a2 2 0 1 0 2.827 2.83l8.588 -7.515z" />
    </svg>
  );
};

const ParachuteIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M22 12a10 10 0 1 0 -20 0" />
      <path d="M22 12c0 -1.66 -1.46 -3 -3.25 -3c-1.8 0 -3.25 1.34 -3.25 3c0 -1.66 -1.57 -3 -3.5 -3s-3.5 1.34 -3.5 3c0 -1.66 -1.46 -3 -3.25 -3c-1.8 0 -3.25 1.34 -3.25 3" />
      <path d="M2 12l10 10l-3.5 -10" />
      <path d="M15.5 12l-3.5 10l10 -10" />
    </svg>
  );
};



https://ui.aceternity.com/components/apple-cards-carousel




You are given a task to integrate a React component into your codebase.
Please verify your project has the following setup:
- shadcn/ui project structure
- Tailwind CSS v4.0
- TypeScript

If any of these are missing, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
File location: components/apple-cards-carousel-demo.tsx

File content: "use client";

import React from "react";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

export default function AppleCardsCarouselDemo() {
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <div className="w-full h-full py-20">
      <h2 className="max-w-7xl pl-4 mx-auto text-xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-200 font-sans">
        Get to know your iSad.
      </h2>
      <Carousel items={cards} />
    </div>
  );
}

const DummyContent = () => {
  return (
    <>
      {[...new Array(3).fill(1)].map((_, index) => {
        return (
          <div
            key={"dummy-content" + index}
            className="bg-[#F5F5F7] dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4"
          >
            <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-2xl font-sans max-w-3xl mx-auto">
              <span className="font-bold text-neutral-700 dark:text-neutral-200">
                The first rule of Apple club is that you boast about Apple club.
              </span>{" "}
              Keep a journal, quickly jot down a grocery list, and take amazing
              class notes. Want to convert those notes to text? No problem.
              Langotiya jeetu ka mara hua yaar is ready to capture every
              thought.
            </p>
            <img
              src="https://assets.aceternity.com/macbook.png"
              alt="Macbook mockup from Aceternity UI"
              height="500"
              width="500"
              className="md:w-1/2 md:h-1/2 h-full w-full mx-auto object-contain"
            />
          </div>
        );
      })}
    </>
  );
};

const data = [
  {
    category: "Artificial Intelligence",
    title: "You can do more with AI.",
    src: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=80&w=3556&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    content: <DummyContent />,
  },
  {
    category: "Productivity",
    title: "Enhance your productivity.",
    src: "https://images.unsplash.com/photo-1531554694128-c4c6665f59c2?q=80&w=3387&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    content: <DummyContent />,
  },
  {
    category: "Product",
    title: "Launching the new Apple Vision Pro.",
    src: "https://images.unsplash.com/photo-1713869791518-a770879e60dc?q=80&w=2333&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    content: <DummyContent />,
  },

  {
    category: "Product",
    title: "Maps for your iPhone 15 Pro Max.",
    src: "https://images.unsplash.com/photo-1599202860130-f600f4948364?q=80&w=2515&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    content: <DummyContent />,
  },
  {
    category: "iOS",
    title: "Photography just got better.",
    src: "https://images.unsplash.com/photo-1602081957921-9137a5d6eaee?q=80&w=2793&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    content: <DummyContent />,
  },
  {
    category: "Hiring",
    title: "Hiring for a Staff Software Engineer",
    src: "https://images.unsplash.com/photo-1511984804822-e16ba72f5848?q=80&w=2048&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    content: <DummyContent />,
  },
];


File location: components/ui/apple-cards-carousel.tsx

File content: "use client";
import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Image, { ImageProps } from "next/image";
import { useOutsideClick } from "@/hooks/use-outside-click";

interface CarouselProps {
  items: JSX.Element[];
  initialScroll?: number;
}

type Card = {
  src: string;
  title: string;
  category: string;
  content: React.ReactNode;
};

export const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({
  onCardClose: () => {},
  currentIndex: 0,
});

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = isMobile() ? 230 : 384; // (md:w-96)
      const gap = isMobile() ? 4 : 8;
      const scrollPosition = (cardWidth + gap) * (index + 1);
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  const isMobile = () => {
    return window && window.innerWidth < 768;
  };

  return (
    <CarouselContext.Provider
      value={{ onCardClose: handleCardClose, currentIndex }}
    >
      <div className="relative w-full">
        <div
          className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-10 [scrollbar-width:none] md:py-20"
          ref={carouselRef}
          onScroll={checkScrollability}
        >
          <div
            className={cn(
              "absolute right-0 z-[1000] h-auto w-[5%] overflow-hidden bg-gradient-to-l",
            )}
          ></div>

          <div
            className={cn(
              "flex flex-row justify-start gap-4 pl-4",
              "mx-auto max-w-7xl", // remove max-w-4xl if you want the carousel to span the full width of its container
            )}
          >
            {items.map((item, index) => (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: 0.2 * index,
                    ease: "easeOut",
                    once: true,
                  },
                }}
                key={"card" + index}
                className="rounded-3xl last:pr-[5%] md:last:pr-[33%]"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mr-10 flex justify-end gap-2">
          <button
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 disabled:opacity-50"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <IconArrowNarrowLeft className="h-6 w-6 text-gray-500" />
          </button>
          <button
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 disabled:opacity-50"
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <IconArrowNarrowRight className="h-6 w-6 text-gray-500" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({
  card,
  index,
  layout = false,
}: {
  card: Card;
  index: number;
  layout?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose, currentIndex } = useContext(CarouselContext);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useOutsideClick(containerRef, () => handleClose());

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              layoutId={layout ? `card-${card.title}` : undefined}
              className="relative z-[60] mx-auto my-10 h-fit max-w-5xl rounded-3xl bg-white p-4 font-sans md:p-10 dark:bg-neutral-900"
            >
              <button
                className="sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-white"
                onClick={handleClose}
              >
                <IconX className="h-6 w-6 text-neutral-100 dark:text-neutral-900" />
              </button>
              <motion.p
                layoutId={layout ? `category-${card.title}` : undefined}
                className="text-base font-medium text-black dark:text-white"
              >
                {card.category}
              </motion.p>
              <motion.p
                layoutId={layout ? `title-${card.title}` : undefined}
                className="mt-4 text-2xl font-semibold text-neutral-700 md:text-5xl dark:text-white"
              >
                {card.title}
              </motion.p>
              <div className="py-10">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.button
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={handleOpen}
        className="relative z-10 flex h-80 w-56 flex-col items-start justify-start overflow-hidden rounded-3xl bg-gray-100 md:h-[40rem] md:w-96 dark:bg-neutral-900"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        <div className="relative z-40 p-8">
          <motion.p
            layoutId={layout ? `category-${card.category}` : undefined}
            className="text-left font-sans text-sm font-medium text-white md:text-base"
          >
            {card.category}
          </motion.p>
          <motion.p
            layoutId={layout ? `title-${card.title}` : undefined}
            className="mt-2 max-w-xs text-left font-sans text-xl font-semibold [text-wrap:balance] text-white md:text-3xl"
          >
            {card.title}
          </motion.p>
        </div>
        <BlurImage
          src={card.src}
          alt={card.title}
          fill
          className="absolute inset-0 z-10 object-cover"
        />
      </motion.button>
    </>
  );
};

export const BlurImage = ({
  height,
  width,
  src,
  className,
  alt,
  ...rest
}: ImageProps) => {
  const [isLoading, setLoading] = useState(true);
  return (
    <img
      className={cn(
        "h-full w-full transition duration-300",
        isLoading ? "blur-sm" : "blur-0",
        className,
      )}
      onLoad={() => setLoading(false)}
      src={src as string}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      blurDataURL={typeof src === "string" ? src : undefined}
      alt={alt ? alt : "Background of a beautiful view"}
      {...rest}
    />
  );
};


File location: hooks/use-outside-click.tsx

File content: import React, { useEffect } from "react";

export const useOutsideClick = (
  ref: React.RefObject<HTMLDivElement>,
  callback: Function
) => {
  useEffect(() => {
    const listener = (event: any) => {
      // DO NOTHING if the element being clicked is the target element or their children
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      callback(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, callback]);
};




https://ui.aceternity.com/components/carousel


You are given a task to integrate a React component into your codebase.
Please verify your project has the following setup:
- shadcn/ui project structure
- Tailwind CSS v4.0
- TypeScript

If any of these are missing, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
File location: components/carousel-demo.tsx

File content: "use client";

import Carousel from "@/components/ui/carousel";
export default function CarouselDemo() {
  const slideData = [
    {
      title: "Mystic Mountains",
      button: "Explore Component",
      src: "https://images.unsplash.com/photo-1494806812796-244fe51b774d?q=80&w=3534&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      title: "Urban Dreams",
      button: "Explore Component",
      src: "https://images.unsplash.com/photo-1518710843675-2540dd79065c?q=80&w=3387&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      title: "Neon Nights",
      button: "Explore Component",
      src: "https://images.unsplash.com/photo-1590041794748-2d8eb73a571c?q=80&w=3456&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      title: "Desert Whispers",
      button: "Explore Component",
      src: "https://images.unsplash.com/photo-1679420437432-80cfbf88986c?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ];
  return (
    <div className="relative overflow-hidden w-full h-full py-20">
      <Carousel slides={slideData} />
    </div>
  );
}


File location: components/ui/carousel.tsx

File content: "use client";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import { useState, useRef, useId, useEffect } from "react";

interface SlideData {
  title: string;
  button: string;
  src: string;
}

interface SlideProps {
  slide: SlideData;
  index: number;
  current: number;
  handleSlideClick: (index: number) => void;
}

const Slide = ({ slide, index, current, handleSlideClick }: SlideProps) => {
  const slideRef = useRef<HTMLLIElement>(null);

  const xRef = useRef(0);
  const yRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      if (!slideRef.current) return;

      const x = xRef.current;
      const y = yRef.current;

      slideRef.current.style.setProperty("--x", `${x}px`);
      slideRef.current.style.setProperty("--y", `${y}px`);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent) => {
    const el = slideRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    xRef.current = event.clientX - (r.left + Math.floor(r.width / 2));
    yRef.current = event.clientY - (r.top + Math.floor(r.height / 2));
  };

  const handleMouseLeave = () => {
    xRef.current = 0;
    yRef.current = 0;
  };

  const imageLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.opacity = "1";
  };

  const { src, button, title } = slide;

  return (
    <div className="[perspective:1200px] [transform-style:preserve-3d]">
      <li
        ref={slideRef}
        className="flex flex-1 flex-col items-center justify-center relative text-center text-white opacity-100 transition-all duration-300 ease-in-out w-[70vmin] h-[70vmin] mx-[4vmin] z-10 "
        onClick={() => handleSlideClick(index)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform:
            current !== index
              ? "scale(0.98) rotateX(8deg)"
              : "scale(1) rotateX(0deg)",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: "bottom",
        }}
      >
        <div
          className="absolute top-0 left-0 w-full h-full bg-[#1D1F2F] rounded-[1%] overflow-hidden transition-all duration-150 ease-out"
          style={{
            transform:
              current === index
                ? "translate3d(calc(var(--x) / 30), calc(var(--y) / 30), 0)"
                : "none",
          }}
        >
          <img
            className="absolute inset-0 w-[120%] h-[120%] object-cover opacity-100 transition-opacity duration-600 ease-in-out"
            style={{
              opacity: current === index ? 1 : 0.5,
            }}
            alt={title}
            src={src}
            onLoad={imageLoaded}
            loading="eager"
            decoding="sync"
          />
          {current === index && (
            <div className="absolute inset-0 bg-black/30 transition-all duration-1000" />
          )}
        </div>

        <article
          className={`relative p-[4vmin] transition-opacity duration-1000 ease-in-out ${
            current === index ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        >
          <h2 className="text-lg md:text-2xl lg:text-4xl font-semibold  relative">
            {title}
          </h2>
          <div className="flex justify-center">
            <button className="mt-6  px-4 py-2 w-fit mx-auto sm:text-sm text-black bg-white h-12 border border-transparent text-xs flex justify-center items-center rounded-2xl hover:shadow-lg transition duration-200 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]">
              {button}
            </button>
          </div>
        </article>
      </li>
    </div>
  );
};

interface CarouselControlProps {
  type: string;
  title: string;
  handleClick: () => void;
}

const CarouselControl = ({
  type,
  title,
  handleClick,
}: CarouselControlProps) => {
  return (
    <button
      className={`w-10 h-10 flex items-center mx-2 justify-center bg-neutral-200 dark:bg-neutral-800 border-3 border-transparent rounded-full focus:border-[#6D64F7] focus:outline-none hover:-translate-y-0.5 active:translate-y-0.5 transition duration-200 ${
        type === "previous" ? "rotate-180" : ""
      }`}
      title={title}
      onClick={handleClick}
    >
      <IconArrowNarrowRight className="text-neutral-600 dark:text-neutral-200" />
    </button>
  );
};

interface CarouselProps {
  slides: SlideData[];
}

export default function Carousel({ slides }: CarouselProps) {
  const [current, setCurrent] = useState(0);

  const handlePreviousClick = () => {
    const previous = current - 1;
    setCurrent(previous < 0 ? slides.length - 1 : previous);
  };

  const handleNextClick = () => {
    const next = current + 1;
    setCurrent(next === slides.length ? 0 : next);
  };

  const handleSlideClick = (index: number) => {
    if (current !== index) {
      setCurrent(index);
    }
  };

  const id = useId();

  return (
    <div
      className="relative w-[70vmin] h-[70vmin] mx-auto"
      aria-labelledby={`carousel-heading-${id}`}
    >
      <ul
        className="absolute flex mx-[-4vmin] transition-transform duration-1000 ease-in-out"
        style={{
          transform: `translateX(-${current * (100 / slides.length)}%)`,
        }}
      >
        {slides.map((slide, index) => (
          <Slide
            key={index}
            slide={slide}
            index={index}
            current={current}
            handleSlideClick={handleSlideClick}
          />
        ))}
      </ul>

      <div className="absolute flex justify-center w-full top-[calc(100%+1rem)]">
        <CarouselControl
          type="previous"
          title="Go to previous slide"
          handleClick={handlePreviousClick}
        />

        <CarouselControl
          type="next"
          title="Go to next slide"
          handleClick={handleNextClick}
        />
      </div>
    </div>
  );
}




https://ui.aceternity.com/components/expandable-card



You are given a task to integrate a React component into your codebase.
Please verify your project has the following setup:
- shadcn/ui project structure
- Tailwind CSS v4.0
- TypeScript

If any of these are missing, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
File location: components/expandable-card-demo-standard.tsx

File content: "use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOutsideClick } from "@/hooks/use-outside-click";

export default function ExpandableCardDemo() {
  const [active, setActive] = useState<(typeof cards)[number] | boolean | null>(
    null
  );
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(false);
      }
    }

    if (active && typeof active === "object") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  return (
    <>
      <AnimatePresence>
        {active && typeof active === "object" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 h-full w-full z-10"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && typeof active === "object" ? (
          <div className="fixed inset-0  grid place-items-center z-[100]">
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
                transition: {
                  duration: 0.05,
                },
              }}
              className="flex absolute top-2 right-2 lg:hidden items-center justify-center bg-white rounded-full h-6 w-6"
              onClick={() => setActive(null)}
            >
              <CloseIcon />
            </motion.button>
            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-[500px]  h-full md:h-fit md:max-h-[90%]  flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden"
            >
              <motion.div layoutId={`image-${active.title}-${id}`}>
                <img
                  width={200}
                  height={200}
                  src={active.src}
                  alt={active.title}
                  className="w-full h-80 lg:h-80 sm:rounded-tr-lg sm:rounded-tl-lg object-cover object-top"
                />
              </motion.div>

              <div>
                <div className="flex justify-between items-start p-4">
                  <div className="">
                    <motion.h3
                      layoutId={`title-${active.title}-${id}`}
                      className="font-bold text-neutral-700 dark:text-neutral-200"
                    >
                      {active.title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${active.description}-${id}`}
                      className="text-neutral-600 dark:text-neutral-400"
                    >
                      {active.description}
                    </motion.p>
                  </div>

                  <motion.a
                    layoutId={`button-${active.title}-${id}`}
                    href={active.ctaLink}
                    target="_blank"
                    className="px-4 py-3 text-sm rounded-full font-bold bg-green-500 text-white"
                  >
                    {active.ctaText}
                  </motion.a>
                </div>
                <div className="pt-4 relative px-4">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-neutral-600 text-xs md:text-sm lg:text-base h-40 md:h-fit pb-10 flex flex-col items-start gap-4 overflow-auto dark:text-neutral-400 [mask:linear-gradient(to_bottom,white,white,transparent)] [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch]"
                  >
                    {typeof active.content === "function"
                      ? active.content()
                      : active.content}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      <ul className="max-w-2xl mx-auto w-full gap-4">
        {cards.map((card, index) => (
          <motion.div
            layoutId={`card-${card.title}-${id}`}
            key={`card-${card.title}-${id}`}
            onClick={() => setActive(card)}
            className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
          >
            <div className="flex gap-4 flex-col md:flex-row ">
              <motion.div layoutId={`image-${card.title}-${id}`}>
                <img
                  width={100}
                  height={100}
                  src={card.src}
                  alt={card.title}
                  className="h-40 w-40 md:h-14 md:w-14 rounded-lg object-cover object-top"
                />
              </motion.div>
              <div className="">
                <motion.h3
                  layoutId={`title-${card.title}-${id}`}
                  className="font-medium text-neutral-800 dark:text-neutral-200 text-center md:text-left"
                >
                  {card.title}
                </motion.h3>
                <motion.p
                  layoutId={`description-${card.description}-${id}`}
                  className="text-neutral-600 dark:text-neutral-400 text-center md:text-left"
                >
                  {card.description}
                </motion.p>
              </div>
            </div>
            <motion.button
              layoutId={`button-${card.title}-${id}`}
              className="px-4 py-2 text-sm rounded-full font-bold bg-gray-100 hover:bg-green-500 hover:text-white text-black mt-4 md:mt-0"
            >
              {card.ctaText}
            </motion.button>
          </motion.div>
        ))}
      </ul>
    </>
  );
}

export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
        transition: {
          duration: 0.05,
        },
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-black"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};

const cards = [
  {
    description: "Lana Del Rey",
    title: "Summertime Sadness",
    src: "https://assets.aceternity.com/demos/lana-del-rey.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Lana Del Rey, an iconic American singer-songwriter, is celebrated for
          her melancholic and cinematic music style. Born Elizabeth Woolridge
          Grant in New York City, she has captivated audiences worldwide with
          her haunting voice and introspective lyrics. <br /> <br /> Her songs
          often explore themes of tragic romance, glamour, and melancholia,
          drawing inspiration from both contemporary and vintage pop culture.
          With a career that has seen numerous critically acclaimed albums, Lana
          Del Rey has established herself as a unique and influential figure in
          the music industry, earning a dedicated fan base and numerous
          accolades.
        </p>
      );
    },
  },
  {
    description: "Babbu Maan",
    title: "Mitran Di Chhatri",
    src: "https://assets.aceternity.com/demos/babbu-maan.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Babu Maan, a legendary Punjabi singer, is renowned for his soulful
          voice and profound lyrics that resonate deeply with his audience. Born
          in the village of Khant Maanpur in Punjab, India, he has become a
          cultural icon in the Punjabi music industry. <br /> <br /> His songs
          often reflect the struggles and triumphs of everyday life, capturing
          the essence of Punjabi culture and traditions. With a career spanning
          over two decades, Babu Maan has released numerous hit albums and
          singles that have garnered him a massive fan following both in India
          and abroad.
        </p>
      );
    },
  },

  {
    description: "Metallica",
    title: "For Whom The Bell Tolls",
    src: "https://assets.aceternity.com/demos/metallica.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Metallica, an iconic American heavy metal band, is renowned for their
          powerful sound and intense performances that resonate deeply with
          their audience. Formed in Los Angeles, California, they have become a
          cultural icon in the heavy metal music industry. <br /> <br /> Their
          songs often reflect themes of aggression, social issues, and personal
          struggles, capturing the essence of the heavy metal genre. With a
          career spanning over four decades, Metallica has released numerous hit
          albums and singles that have garnered them a massive fan following
          both in the United States and abroad.
        </p>
      );
    },
  },
  {
    description: "Led Zeppelin",
    title: "Stairway To Heaven",
    src: "https://assets.aceternity.com/demos/led-zeppelin.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Led Zeppelin, a legendary British rock band, is renowned for their
          innovative sound and profound impact on the music industry. Formed in
          London in 1968, they have become a cultural icon in the rock music
          world. <br /> <br /> Their songs often reflect a blend of blues, hard
          rock, and folk music, capturing the essence of the 1970s rock era.
          With a career spanning over a decade, Led Zeppelin has released
          numerous hit albums and singles that have garnered them a massive fan
          following both in the United Kingdom and abroad.
        </p>
      );
    },
  },
  {
    description: "Mustafa Zahid",
    title: "Toh Phir Aao",
    src: "https://assets.aceternity.com/demos/toh-phir-aao.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          &quot;Aawarapan&quot;, a Bollywood movie starring Emraan Hashmi, is
          renowned for its intense storyline and powerful performances. Directed
          by Mohit Suri, the film has become a significant work in the Indian
          film industry. <br /> <br /> The movie explores themes of love,
          redemption, and sacrifice, capturing the essence of human emotions and
          relationships. With a gripping narrative and memorable music,
          &quot;Aawarapan&quot; has garnered a massive fan following both in
          India and abroad, solidifying Emraan Hashmi&apos;s status as a
          versatile actor.
        </p>
      );
    },
  },
];


File location: hooks/use-outside-click.tsx

File content: import React, { useEffect } from "react";

export const useOutsideClick = (
  ref: React.RefObject<HTMLDivElement>,
  callback: Function
) => {
  useEffect(() => {
    const listener = (event: any) => {
      // DO NOTHING if the element being clicked is the target element or their children
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      callback(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, callback]);
};




https://ui.aceternity.com/components/floating-dock


You are given a task to integrate a React component into your codebase.
Please verify your project has the following setup:
- shadcn/ui project structure
- Tailwind CSS v4.0
- TypeScript

If any of these are missing, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
File location: components/floating-dock-demo.tsx

File content: import React from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconBrandGithub,
  IconBrandX,
  IconExchange,
  IconHome,
  IconNewSection,
  IconTerminal2,
} from "@tabler/icons-react";

export default function FloatingDockDemo() {
  const links = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },

    {
      title: "Products",
      icon: (
        <IconTerminal2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Components",
      icon: (
        <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Aceternity UI",
      icon: (
        <img
          src="https://assets.aceternity.com/logo-dark.png"
          width={20}
          height={20}
          alt="Aceternity Logo"
        />
      ),
      href: "#",
    },
    {
      title: "Changelog",
      icon: (
        <IconExchange className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },

    {
      title: "Twitter",
      icon: (
        <IconBrandX className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "GitHub",
      icon: (
        <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
  ];
  return (
    <div className="flex items-center justify-center h-[35rem] w-full">
      <FloatingDock
        mobileClassName="translate-y-20" // only for demo, remove for production
        items={links}
      />
    </div>
  );
}


File location: components/ui/floating-dock.tsx

File content: import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { useRef, useState } from "react";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: { title: string; icon: React.ReactNode; href: string }[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href: string }[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                <a
                  href={item.href}
                  key={item.title}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-900"
                >
                  <div className="h-4 w-4">{item.icon}</div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-800"
      >
        <IconLayoutNavbarCollapse className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href: string }[];
  className?: string;
}) => {
  let mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden h-16 items-end gap-4 rounded-2xl bg-gray-50 px-4 pb-3 md:flex dark:bg-neutral-900",
        className,
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href: string;
}) {
  let ref = useRef<HTMLDivElement>(null);

  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  let heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [20, 40, 20],
  );

  let width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  let widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <a href={href}>
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex aspect-square items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-800"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-8 left-1/2 w-fit rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs whitespace-pre text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </motion.div>
    </a>
  );
}



https://ui.aceternity.com/components/lamp-effect



You are given a task to integrate a React component into your codebase.
Please verify your project has the following setup:
- shadcn/ui project structure
- Tailwind CSS v4.0
- TypeScript

If any of these are missing, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
File location: components/lamp-demo.tsx

File content: "use client";
import React from "react";
import { motion } from "motion/react";
import { LampContainer } from "@/components/ui/lamp";

export default function LampDemo() {
  return (
    <LampContainer>
      <motion.h1
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
      >
        Build lamps <br /> the right way
      </motion.h1>
    </LampContainer>
  );
}


File location: components/ui/lamp.tsx

File content: "use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export default function LampDemo() {
  return (
    <LampContainer>
      <motion.h1
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
      >
        Build lamps <br /> the right way
      </motion.h1>
    </LampContainer>
  );
}

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 w-full rounded-md z-0",
        className
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0 ">
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-cyan-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute  w-[100%] left-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute  w-40 h-[100%] left-0 bg-slate-950  bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-cyan-500 text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute  w-40 h-[100%] right-0 bg-slate-950  bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute  w-[100%] right-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-slate-950 blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md"></div>
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-cyan-500 opacity-50 blur-3xl"></div>
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-cyan-400 blur-2xl"
        ></motion.div>
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-cyan-400 "
        ></motion.div>

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-slate-950 "></div>
      </div>

      <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
        {children}
      </div>
    </div>
  );
};




https://bundui.io/docs/components/background-snowfall-animation


import { Button } from "@/components/ui/button";
import Snowfall from "@/components/core/backgrounds/snowfall";

export default function SnowfallBackgroundExample() {
  return (
    <Snowfall className="aspect-16/9 flex items-center justify-center">
      <div className="text-center space-y-4 lg:space-y-6 z-10">
        <div className="text-2xl lg:text-4xl text-foregorund/80">
          Bundui Components
        </div>
        <Button>Discover Excellence</Button>
      </div>
    </Snowfall>
  );
}



https://bundui.io/docs/components/stars-background

import { Button } from "@/components/ui/button";
import { StarsBackground } from "@/components/core/backgrounds/stars";

export default function StarsBackgroundExample() {
  return (
    <StarsBackground className="aspect-16/9 flex items-center justify-center">
      <div className="text-center space-y-4 lg:space-y-6 z-10">
        <div className="text-2xl lg:text-4xl text-white/80">
          Bundui Components
        </div>
        <Button>Discover Excellence</Button>
      </div>
    </StarsBackground>
  );
}


https://bundui.io/docs/components/floating-paths-background

import { FloatingPathsBackground } from "@/components/core/backgrounds/floating-paths";
import { Button } from "@/components/ui/button";

export default function FloatingPathsBackgroundExample() {
  return (
    <FloatingPathsBackground
      className="aspect-16/9 flex items-center justify-center"
      position={-1}
    >
      <div className="text-center space-y-4 lg:space-y-6 z-10">
        <div className="text-2xl lg:text-4xl text-black/80 dark:text-white/80">
          Bundui Components
        </div>
        <Button>Discover Excellence</Button>
      </div>
    </FloatingPathsBackground>
  );
}


https://bundui.io/docs/components/wavy-background

import { Button } from "@/components/ui/button";
import WavyBackground from "@/components/core/backgrounds/wavy";

export default function WavyBackgroundExample() {
  return (
    <WavyBackground className="aspect-16/9 flex items-center justify-center">
      <div className="text-center space-y-4 lg:space-y-6 z-10">
        <div className="text-2xl lg:text-4xl text-white/80">
          Bundui Components
        </div>
        <Button>Discover Excellence</Button>
      </div>
    </WavyBackground>
  );
}

https://ui.stackzero.co/docs/blocks/product-card

"use client";

import ImageViewer from "@/components/commerce-ui/components/image-viewer/basic/image-viewer-basic";
import PriceFormat from "@/components/commerce-ui/components/price-format/basic/price-format-basic";
import StarRating_Fractions from "@/components/commerce-ui/components/star-rating/fractions/star-rating-fractions";
import { Button } from "@/components/ui/button";

const DEFAULT_IMAGE_URL =
  "https://raw.githubusercontent.com/stackzero-labs/ui/refs/heads/main/public/placeholders/headphone-1.jpg";

interface ProductCardProps {
  imageUrl?: string;
  discount?: string | null;
  title?: string;
  description?: string;
  price?: number;
  prefix?: string;
  rating?: number;
  reviewCount?: number;
  onAddToCart?: () => void;
  onBuyNow?: () => void;
  freeShipping?: boolean;
}

function ProductCard_01({
  description = "Premium noise-cancelling headphones with surround sound technology and high comfort",
  discount = "20% OFF",
  freeShipping = true,
  imageUrl = DEFAULT_IMAGE_URL,
  onAddToCart = () => {},
  onBuyNow = () => {},
  prefix = "$",
  price = 98.96,
  rating = 4.7,
  reviewCount = 65,
  title = "Wireless headset",
}: ProductCardProps = {}) {
  return (
    <div className="group relative flex w-[350px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      {/* Image section with background and dynamic glow effect */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-50 p-5 dark:from-teal-950/30 dark:to-cyan-950/30">
        {discount && (
          <div className="absolute top-3 left-3 z-10">
            <span className="relative inline-block rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-1.5 text-xs font-bold text-white">
              {discount}
            </span>
          </div>
        )}

        {/* Glow effect */}
        <div className="absolute -bottom-10 left-1/2 h-40 w-40 -translate-x-1/2 transform rounded-full bg-teal-500/20 blur-3xl"></div>

        <div className="transition-transform duration-500 group-hover:scale-105">
          <ImageViewer
            imageUrl={imageUrl}
            classNameThumbnailViewer="rounded-lg object-contain h-[200px] mx-auto"
          />
        </div>
      </div>

      {/* Content section */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="mb-1.5 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {title}
          </h3>

          {/* Rating */}
          <div className="mb-2 flex items-center">
            <StarRating_Fractions
              value={rating}
              maxStars={5}
              readOnly
              iconSize={16}
              color="#0d9488"
            />
            <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
              {rating} ({reviewCount} reviews)
            </span>
          </div>

          <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>

        {/* Price and shipping info */}
        <div className="mt-auto flex flex-col">
          <PriceFormat
            prefix={prefix}
            value={price}
            className="text-2xl font-bold text-teal-700 dark:text-teal-400"
          />

          {freeShipping && (
            <p className="mt-1 inline-flex items-center text-sm text-green-600 dark:text-green-400">
              <svg
                className="mr-1 h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              Free Shipping
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={onAddToCart}
            className="w-full border-gray-300 bg-white text-gray-800 transition-all duration-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-teal-500 dark:hover:bg-gray-700"
          >
            Add to cart
          </Button>
          <Button
            onClick={onBuyNow}
            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white transition-all hover:from-teal-700 hover:to-cyan-700"
          >
            Buy now
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard_01;
export type { ProductCardProps };



