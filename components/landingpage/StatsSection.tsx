import InteractiveBentoGallery from "./blocks/interactive-bento-gallery"

/* eslint-disable @next/next/no-img-element */
import { BlurFade } from "@/components/magicui/blur-fade";

// Remplacez cette liste par les liens vers vos propres images.
// Pour de meilleurs résultats avec ce layout, mélangez des images
// de différentes hauteurs (portraits et paysages).
const images = [
  "/1.png",
  "/2.png",
  "/3.png",
  "/4.png",
  "/5.png",
  "/6.png",
  "/7.png",
  "/8.png",
  "/9.png",
  "/10.png",
  "/11.png",
  "/12.png",
  "/13.png",
  "/14.png",
  "/hero-visual.jpg",
]

// const mediaItems = [
//   {
//     id: 1,
//     type: "image",
//     title: "Anurag Mishra",
//     desc: "Driven, innovative, visionary",
//     url: "/3.png",
//     span: "md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2",
//   },
//   {
//     id: 2,
//     type: "image",
//     title: "Dog Puppy",
//     desc: "Adorable loyal companion.",
//     url: "/2.png",
//     span: "md:col-span-2 md:row-span-2 col-span-1 sm:col-span-2 sm:row-span-2",
//   },
//   {
//     id: 3,
//     type: "image",
//     title: "Forest Path",
//     desc: "Mystical forest trail",
//     url: "/4.png",
//     span: "md:col-span-1 md:row-span-3 sm:col-span-2 sm:row-span-2 ",
//   },
//   {
//     id: 4,
//     type: "image",
//     title: "Falling Leaves",
//     desc: "Autumn scenery",
//     url: "/5.png",
//     span: "md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2 ",
//   },
//   {
//     id: 5,
//     type: "video",
//     title: "Bird Parrot",
//     desc: "Vibrant feathered charm",
//     url: "/luxe.mp4",
//     span: "md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2 ",
//   },
//   {
//     id: 6,
//     type: "image",
//     title: "Beach Paradise",
//     desc: "Sunny tropical beach",
//     url: "/6.png",
//     span: "md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2 ",
//   },
//   {
//     id: 7,
//     type: "video",
//     title: "Shiva Temple",
//     desc: "Peaceful Shiva sanctuary.",
//     url: "/blanck.mp4",
//     span: "md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2 ",
//   },

//   {
//     id: 8,
//     type: "image",
//     title: "Dog Puppy",
//     desc: "Adorable loyal companion.",
//     url: "/7.png",
//     span: "md:col-span-1 md:row-span-3 sm:col-span-2 sm:row-span-2",
//   },
//   {
//     id: 9,
//     type: "image",
//     title: "Forest Path",
//     desc: "Mystical forest trail",
//     url: "/8.png",
//     span: "md:col-span-2 md:row-span-2 col-span-1 sm:col-span-2 sm:row-span-2",
//   },
//   {
//     id: 10,
//     type: "image",
//     title: "Falling Leaves",
//     desc: "Autumn scenery",
//     url: "/9.png",
//     span: "md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2",
//   },
//   {
//     id: 11,
//     type: "image",
//     title: "Bird Parrot",
//     desc: "Vibrant feathered charm",
//     url: "/10.png",
//     span: "md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2",
//   },
//   {
//     id: 12,
//     type: "image",
//     title: "Beach Paradise",
//     desc: "Sunny tropical beach",
//     url: "/11.png",
//     span: "md:col-span-1 md:row-span-3 sm:col-span-2 sm:row-span-2",
//   },
  
// ]

export default function StatsSection() {

  const title = "Minato Gallery"
  const description = "Explore a collection of unique artworks, brought to life by your imagination and guided by Minato AI.";

  return (
    // <div className="min-h-screen overflow-y-auto">
      
    //   <InteractiveBentoGallery
    //     mediaItems={mediaItems}
    //     title="Gallery Shots Collection"
    //     description="Drag and explore our curated collection of shots"
    //   />
    // </div>

     <section id="photos" className="w-full py-12 md:py-20">
      {/* Conteneur principal pour centrer le contenu et limiter sa largeur */}
      <div className="container mx-auto max-w-5xl px-4">
        
        {/* === BLOC DE TEXTE AJOUTÉ ICI === */}
        <div className="mb-12 text-center">
          <BlurFade delay={0.25} inView>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {title}
            </h2>
          </BlurFade>
          <BlurFade delay={0.35} inView>
            <p className="mx-auto mt-4 max-w-[700px] text-gray-500  text-sm/relaxed dark:text-gray-400">
              {description}
            </p>
          </BlurFade>
        </div>

        {/* La grille d'images est maintenant à l'intérieur du conteneur centré */}
        <div className="columns-2 gap-4 sm:columns-3">
          {images.map((imageUrl, idx) => (
            <BlurFade key={imageUrl} delay={0.25 + idx * 0.05} inView>
              <img
                className="mb-4 size-full rounded-lg object-cover" // Note: object-cover est souvent plus esthétique ici
                src={imageUrl}
                alt={`Gallery image ${idx + 1}`}
              />
            </BlurFade>
          ))}
        </div>
      </div>
    </section>


  )
}
