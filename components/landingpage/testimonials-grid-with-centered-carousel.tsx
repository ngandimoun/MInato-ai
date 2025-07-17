"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import Image, { StaticImageData } from "next/image";
import { Transition } from "@headlessui/react";

export function TestimonialsGridWithCenteredCarousel() {
  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pt-20 overflow-hidden h-full bg-white">
      <div className="pb-20">
        <h1 className="pt-4 font-bold text-[var(--color-text-heading)] text-lg md:text-2xl">
          Trusted by Creators & Teams Worldwide
        </h1>
        <p className="text-base text-[var(--color-text-body)] mt-2">
          Experience the harmony of AI-powered productivity with Japanese-inspired design philosophy.
        </p>
      </div>

      <div className="relative">
        <TestimonialsSlider />
        <div className="h-full max-h-screen md:max-h-none overflow-hidden w-full opacity-60 [mask-image:radial-gradient(circle_at_center,transparent_10%,white_99%)]">
          <TestimonialsGrid />
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-40 w-full bg-gradient-to-t from-white to-transparent"></div>
    </div>
  );
}

export const TestimonialsGrid = () => {
  const first = testimonials.slice(0, 3);
  const second = testimonials.slice(3, 6);
  const third = testimonials.slice(6, 9);
  const fourth = testimonials.slice(9, 12);

  const grid = [first, second, third, fourth];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
      {grid.map((testimonialsCol, index) => (
        <div key={`testimonials-col-${index}`} className="grid gap-4">
          {testimonialsCol.map((testimonial) => (
            <Card key={`testimonial-${testimonial.src}-${index}`}>
              <Quote>{testimonial.quote}</Quote>
              <div className="flex gap-2 items-center mt-8">
                <Image
                  src={testimonial.src}
                  alt={testimonial.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div className="flex flex-col">
                  <QuoteDescription>{testimonial.name}</QuoteDescription>
                  <QuoteDescription className="text-[10px]">
                    {testimonial.designation}
                  </QuoteDescription>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "p-8 rounded-xl border border-[var(--color-border)] bg-white shadow-sm hover:shadow-md transition-shadow duration-300",
        className
      )}
    >
      {children}
    </div>
  );
};

export const Quote = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3
      className={cn(
        "text-xs font-semibold text-[var(--color-text-heading)] py-2",
        className
      )}
    >
      {children}
    </h3>
  );
};

export const QuoteDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p
      className={cn(
        "text-xs font-normal text-[var(--color-muted-foreground)] max-w-sm",
        className
      )}
    >
      {children}
    </p>
  );
};

interface Testimonial {
  src: string;
  quote: string;
  name: string;
  designation?: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "Yuki Tanaka",
    quote:
      "Minato's AI capabilities are extraordinary. The way it understands context and provides intelligent suggestions has revolutionized my creative workflow. It's like having a brilliant collaborator who never sleeps.",
    src: "https://i.pravatar.cc/150?img=1",
    designation: "Creative Director & Digital Artist",
  },
  {
    name: "Sarah Chen",
    quote:
      "The Japanese-inspired design isn't just beautiful—it's functional. Every element feels intentional, creating a sense of calm focus that helps me stay productive throughout the day.",
    src: "https://i.pravatar.cc/150?img=2",
    designation: "UX Designer & Entrepreneur",
  },
  {
    name: "Marcus Rodriguez",
    quote:
      "As a student, Minato has been a game-changer. The comprehensive toolset helps me research, organize, and create content efficiently. It's become essential for my academic success.",
    src: "https://i.pravatar.cc/150?img=3",
    designation: "Graduate Student & Research Assistant",
  },
  {
    name: "Elena Vasquez",
    quote:
      "Our team's productivity has increased by 40% since adopting Minato. The seamless collaboration features and intelligent automation make complex projects feel manageable.",
    src: "https://i.pravatar.cc/150?img=4",
    designation: "Team Lead & Project Manager",
  },
  {
    name: "David Park",
    quote:
      "The attention to detail in Minato's interface is remarkable. It embodies the Japanese principle of monozukuri—the art of making things with pride and dedication.",
    src: "https://i.pravatar.cc/150?img=5",
    designation: "Product Designer & Minimalist",
  },
  {
    name: "Aria Johnson",
    quote:
      "Minato's AI doesn't just automate tasks—it enhances creativity. The intelligent suggestions and contextual insights have opened up new possibilities in my design work.",
    src: "https://i.pravatar.cc/150?img=6",
    designation: "Freelance Designer & Creative Professional",
  },
  {
    name: "Kenji Nakamura",
    quote:
      "The harmony between technology and aesthetics in Minato reflects true Japanese craftsmanship. It's a tool that respects both efficiency and beauty.",
    src: "https://i.pravatar.cc/150?img=7",
    designation: "Tech Executive & Innovation Consultant",
  },
  {
    name: "Rachel Kim",
    quote:
      "Starting my business felt overwhelming until I discovered Minato. The comprehensive suite of tools and intuitive design helped me launch successfully and scale efficiently.",
    src: "https://i.pravatar.cc/150?img=8",
    designation: "Startup Founder & Entrepreneur",
  },
  {
    name: "Tom Anderson",
    quote:
      "The productivity boost from Minato is incredible. What used to take hours now takes minutes, and the quality of output has improved dramatically.",
    src: "https://i.pravatar.cc/150?img=9",
    designation: "Content Creator & Digital Strategist",
  },
  {
    name: "Lisa Wang",
    quote:
      "Minato understands the modern creative professional's needs perfectly. The balance of powerful AI features with elegant simplicity is unmatched.",
    src: "https://i.pravatar.cc/150?img=10",
    designation: "Marketing Director & Brand Strategist",
  },
  {
    name: "Alex Thompson",
    quote:
      "The learning curve for Minato is surprisingly gentle. The Japanese-inspired interface guides you naturally through complex workflows, making advanced features accessible.",
    src: "https://i.pravatar.cc/150?img=11",
    designation: "Software Engineer & Technical Writer",
  },
  {
    name: "Maya Patel",
    quote:
      "Minato has transformed how our team collaborates. The thoughtful design and intelligent features create a workspace that encourages both focus and creativity.",
    src: "https://i.pravatar.cc/150?img=12",
    designation: "Creative Team Lead & Innovation Manager",
  },
];

export const TestimonialsSlider = () => {
  const [active, setActive] = useState<number>(0);
  const [autorotate, setAutorotate] = useState<boolean>(true);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  const slicedTestimonials = testimonials.slice(0, 5);

  useEffect(() => {
    if (!autorotate) return;
    const interval = setInterval(() => {
      setActive(
        active + 1 === slicedTestimonials.length ? 0 : (active) => active + 1
      );
    }, 7000);
    return () => clearInterval(interval);
  }, [active, autorotate, slicedTestimonials.length]);

  const heightFix = () => {
    if (testimonialsRef.current && testimonialsRef.current.parentElement)
      testimonialsRef.current.parentElement.style.height = `${testimonialsRef.current.clientHeight}px`;
  };

  useEffect(() => {
    heightFix();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        heightFix();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <section className="absolute inset-0 mt-20 md:mt-60">
      <div className="max-w-3xl mx-auto relative z-40 h-80">
        <div className="relative pb-12 md:pb-20">
          {/* Carousel */}
          <div className="text-center">
            {/* Testimonial image */}
            <div className="relative h-40 [mask-image:_linear-gradient(0deg,transparent,#FFFFFF_30%,#FFFFFF)] md:[mask-image:_linear-gradient(0deg,transparent,#FFFFFF_40%,#FFFFFF)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[480px] -z-10 pointer-events-none before:rounded-full rounded-full before:absolute before:inset-0 before:bg-gradient-to-b before:from-[var(--color-primary)]/10 before:to-transparent before:to-20% after:rounded-full after:absolute after:inset-0 after:bg-white after:m-px before:-z-20 after:-z-20">
                {slicedTestimonials.map((item, index) => (
                  <Transition
                    key={index}
                    show={active === index}
                    enter="transition ease-[cubic-bezier(0.68,-0.3,0.32,1)] duration-700 order-first"
                    enterFrom="opacity-0 -translate-x-10"
                    enterTo="opacity-100 translate-x-0"
                    leave="transition ease-[cubic-bezier(0.68,-0.3,0.32,1)] duration-700"
                    leaveFrom="opacity-100 translate-x-0"
                    leaveTo="opacity-0 translate-x-10"
                    beforeEnter={() => heightFix()}
                    as="div"
                  >
                    <div className="absolute inset-0 h-full -z-10">
                      <Image
                        className="relative top-11 left-1/2 -translate-x-1/2 rounded-full ring-2 ring-[var(--color-primary)]/20"
                        src={item.src}
                        width={56}
                        height={56}
                        alt={item.name}
                      />
                    </div>
                  </Transition>
                ))}
              </div>
            </div>
            {/* Text */}
            <div className="mb-10 transition-all duration-150 delay-300 ease-in-out px-8 sm:px-6">
              <div className="relative flex flex-col" ref={testimonialsRef}>
                {slicedTestimonials.map((item, index) => (
                  <Transition
                    key={index}
                    show={active === index}
                    enter="transition ease-in-out duration-500 delay-200 order-first"
                    enterFrom="opacity-0 -translate-x-4"
                    enterTo="opacity-100 translate-x-0"
                    leave="transition ease-out duration-300 delay-300 absolute"
                    leaveFrom="opacity-100 translate-x-0"
                    leaveTo="opacity-0 translate-x-4"
                    beforeEnter={() => heightFix()}
                    as="div"
                  >
                    <div className="text-base md:text-xl font-semibold">
                      "{item.quote}"
                    </div>
                  </Transition>
                ))}
              </div>
            </div>
            {/* Buttons */}
            <div className="flex flex-wrap justify-center -m-1.5 px-8 sm:px-6">
              {slicedTestimonials.map((item, index) => (
                <button
                  className={cn(
                    `px-3 py-2 rounded-full m-1.5 text-xs font-medium transition-all duration-300 ease-in-out ${
                      active === index
                        ? "bg-primary text-white border border-[var(--color-border)] shadow-md"
                        : "bg-white  border border-[var(--color-border)]"
                    }`
                  )}
                  key={index}
                  onClick={() => {
                    setActive(index);
                    setAutorotate(false);
                  }}
                >
                  <span className="relative">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-[10px] opacity-70 ml-1">
                      • {item.designation}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};