"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function MotionSystem() {
  useGSAP(() => {
    const reveals = gsap.utils.toArray<HTMLElement>(".motion-reveal");
    const scaleItems = gsap.utils.toArray<HTMLElement>(".motion-scale");
    const scrubWords = gsap.utils.toArray<HTMLElement>(".scrub-word");
    const waveBars = gsap.utils.toArray<HTMLElement>(".wave-bar");

    if (reveals.length) {
      gsap.fromTo(
        reveals,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 }
      );
    }

    scaleItems.forEach((element) => {
      gsap.fromTo(
        element,
        { scale: 0.92, opacity: 0.35 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            end: "bottom 28%",
            scrub: true
          }
        }
      );
    });

    scrubWords.forEach((word, index) => {
      gsap.fromTo(
        word,
        { opacity: 0.16 },
        {
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: word.parentElement,
            start: `top+=${index * 10} 85%`,
            end: "bottom 45%",
            scrub: true
          }
        }
      );
    });

    if (waveBars.length) {
      gsap.to(waveBars, {
        scaleY: 0.35,
        duration: 0.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.08, from: "center" }
      });
    }
  }, []);

  return null;
}
