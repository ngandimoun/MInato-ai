import Link from "next/link";
import React from "react";
// L'icône Mail reste car elle est générique et non une marque
import { Mail } from "lucide-react";

// --- Définition des composants SVG avec leurs couleurs d'origine ---

const XIcon = (props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>) => (
  // Le logo X (Twitter) est simple, un fond noir suffit.
  <svg viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6904H306.615L611.412 515.685L658.88 583.579L1055.08 1150.31H892.476L569.165 687.854V687.828Z" fill="#000000" />
  </svg>
);

const InstagramIcon = (props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>) => (
  // SVG complexe pour le dégradé d'Instagram
  <svg viewBox="0 0 24 24" {...props}>
    <defs>
      <radialGradient id="insta-gradient" cx="0.3" cy="1" r="1">
        <stop offset="0" stopColor="#FFDC80" />
        <stop offset="0.25" stopColor="#FCAF45" />
        <stop offset="0.5" stopColor="#F77737" />
        <stop offset="0.75" stopColor="#F56040" />
        <stop offset="1" stopColor="#FD1D1D" />
      </radialGradient>
    </defs>
    <path fill="url(#insta-gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-1.608c-3.466 0-3.893.015-5.25.078-4.27.195-6.22 2.21-6.415 6.415-.063 1.357-.078 1.783-.078 5.25s.015 3.893.078 5.25c.195 4.205 2.145 6.22 6.415 6.415 1.357.063 1.783.078 5.25.078s3.893-.015 5.25-.078c4.27-.195 6.22-2.21 6.415-6.415.063-1.357.078-1.783.078-5.25s-.015-3.893-.078-5.25c-.195-4.205-2.145-6.22-6.415-6.415-1.357-.063-1.783-.078-5.25-.078z" />
    <path fill="url(#insta-gradient)" d="M12 6.865A5.135 5.135 0 1017.135 12 5.135 5.135 0 0012 6.865zm0 8.71A3.575 3.575 0 1115.575 12 3.575 3.575 0 0112 15.575z" />
    <circle fill="url(#insta-gradient)" cx="18.305" cy="5.695" r="1.25" />
  </svg>
);

const TiktokIcon = (props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>) => (
  // SVG TikTok avec ses 3 couleurs distinctes.
  <svg viewBox="0 0 24 24" {...props}>
    <path fill="#FF0050" d="M16.6 5.82s.51.5 0 0A4.27 4.27 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.59A2.59 2.59 0 0 1 7.27 18a2.59 2.59 0 0 1 2.59-2.59v-3.1a5.7 5.7 0 0 0-5.7 5.7A5.7 5.7 0 0 0 9.86 21a5.7 5.7 0 0 0 5.7-5.7V9.01a7.35 7.35 0 0 0 4.31-2.27Z" />
    <path fill="#00F2EA" d="M16.6 5.82s.51.5 0 0A4.27 4.27 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.59A2.59 2.59 0 0 1 7.27 18a2.59 2.59 0 0 1 2.59-2.59v-3.1a5.7 5.7 0 0 0-5.7 5.7A5.7 5.7 0 0 0 9.86 21a5.7 5.7 0 0 0 5.7-5.7V9.01a7.35 7.35 0 0 0 4.31-2.27Z" style={{ mixBlendMode: 'screen' }} />
  </svg>
);

const FacebookIcon = (props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <path fill="#1877F2" d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.09 16.1 2 15 2c-2.44 0-4 1.4-4 4.5V9.5H8v4h3v9.5h3V13.5z" />
  </svg>
);

const LinkedinIcon = (props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <path fill="#0077B5" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

export default function Footer() {
  const productLinks = [
    { title: "Features", href: "/features" },
    { title: "Pricing", href: "/pricing" },
    { title: "Updates", href: "/updates" },
  ];

  const companyLinks = [
    { title: "About", href: "/about" },
    { title: "Blog", href: "/blog" },
    { title: "Careers", href: "/careers" },
  ];

  const supportLinks = [
    { title: "Help Center", href: "/help" },
    { title: "Contact", href: "/contact" },
    { title: "Documentation", href: "/docs" },
  ];

  const legalLinks = [
    { title: "Privacy", href: "/privacy" },
    { title: "Terms", href: "/terms" },
    { title: "Security", href: "/security" },
  ];

  const socialLinks = [
    { title: "X (Twitter)", href: "https://x.com/chrisngand14511?s=21", icon: XIcon },
    // { title: "Instagram", href: "https://instagram.com/minato", icon: InstagramIcon },
    //{ title: "TikTok", href: "https://tiktok.com/@minato", icon: TiktokIcon },
    //{ title: "Facebook", href: "https://facebook.com/minato", icon: FacebookIcon },
    { title: "LinkedIn", href: "https://www.linkedin.com/in/chris-ngandimoun-745508109/", icon: LinkedinIcon },
    { title: "Email", href: "mailto:nchrisdonson@gmail.com", icon: Mail },
  ];

  return (
    <footer className="border-t border-gray-200 px-8 py-10 bg-white w-full relative">
      <div className="max-w-7xl mx-auto text-sm text-gray-600 flex sm:flex-row flex-col justify-between items-start md:px-8">
        <div className="mb-10 sm:mb-0">
          <div className="mr-0 md:mr-4 md:flex mb-6">
            <Logo />
          </div>

          <div className="flex space-x-6 mb-6">
            {socialLinks.map((social, idx) => (
              <Link
                key={`social-${idx}`}
                href={social.href}
                className="text-gray-500 hover:opacity-75 transition-opacity"
                target={social.href.startsWith('http') ? '_blank' : '_self'}
                rel={social.href.startsWith('http') ? 'noopener noreferrer' : ''}
              >
                <social.icon className="w-5 h-5" />
              </Link>
            ))}
          </div>

          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Minato. All rights reserved.
          </div>
        </div>
        <p className="text-center hidden md:inline text-5xl text-[12rem] font-bold bg-gradient-to-r from-gray-900/20 via-red-600/10 to-pink-600/15 bg-clip-text text-transparent select-none pointer-events-none">
          Minato
        </p>
      </div>
    </footer>
  );
}

const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-3 items-center text-base mr-4 text-gray-900 px-2 py-1 relative z-20 group"
    >
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
        <div className="w-8 h-8 bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          湊
        </div>
      </div>
      <span className="font-semibold text-gray-900 tracking-tight">Minato</span>
    </Link>
  );
};