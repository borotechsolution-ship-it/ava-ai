"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export type StatsCardProps = {
  title: string;
  mainValue: string;
  note: string;
  icon: "visibility" | "sensors" | "task" | "bars";
  visual: "sparkline" | "radar" | "dots" | "bars";
  tone?: "blue" | "green" | "amber";
};

const iconPaths = {
  visibility: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </>
  ),
  sensors: (
    <>
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
      <path d="M6.6 6.6l2.8 2.8M14.6 14.6l2.8 2.8M17.4 6.6l-2.8 2.8M9.4 14.6l-2.8 2.8" />
    </>
  ),
  task: (
    <>
      <path d="M5 12.5 10 17 19 7" />
      <path d="M4 4h16v16H4z" />
    </>
  ),
  bars: (
    <>
      <path d="M5 19V9M12 19V5M19 19v-7" />
      <path d="M3 19h18" />
    </>
  )
};

export function StatsCard({ title, mainValue, note, icon, visual, tone = "blue" }: StatsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const animated = cardRef.current?.querySelectorAll<HTMLElement>(".stat-animate") || [];
      const spark = cardRef.current?.querySelector<SVGPathElement>(".spark-path");
      const bars = cardRef.current?.querySelectorAll<HTMLElement>(".mini-bar") || [];

      if (animated.length) {
        gsap.fromTo(
          animated,
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.06 }
        );
      }

      if (spark) {
        gsap.fromTo(spark, { strokeDashoffset: 180 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" });
      }

      if (bars.length) {
        gsap.fromTo(
          bars,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 0.8,
            ease: "elastic.out(1, 0.7)",
            stagger: 0.06,
            transformOrigin: "bottom"
          }
        );
      }
    },
    { scope: cardRef }
  );

  return (
    <article className={`stat-card mixed-stat tone-${tone}`} ref={cardRef}>
      <div className={`stat-icon ${tone}`} aria-hidden="true">
        <svg viewBox="0 0 24 24">{iconPaths[icon]}</svg>
      </div>
      <span className="stat-animate">{title}</span>
      <div className="stat-line stat-animate">
        <strong>{mainValue}</strong>
        <em>{note}</em>
      </div>
      <div className="stat-visual stat-animate" aria-hidden="true">
        {visual === "sparkline" ? <Sparkline /> : null}
        {visual === "radar" ? <Radar /> : null}
        {visual === "dots" ? <Dots /> : null}
        {visual === "bars" ? <Bars /> : null}
      </div>
    </article>
  );
}

function Sparkline() {
  return (
    <svg className="sparkline" viewBox="0 0 180 54" preserveAspectRatio="none">
      <path className="spark-fill" d="M0 44 Q18 18 36 30 T72 20 T108 38 T144 16 T180 26 L180 54 L0 54Z" />
      <path className="spark-path" d="M0 44 Q18 18 36 30 T72 20 T108 38 T144 16 T180 26" />
    </svg>
  );
}

function Radar() {
  return (
    <div className="radar-visual">
      <i />
      <i />
      <i />
      <span />
    </div>
  );
}

function Dots() {
  return (
    <div className="dot-progress">
      <i className="done" />
      <i className="done" />
      <i />
      <i />
      <i />
    </div>
  );
}

function Bars() {
  return (
    <div className="mini-bars">
      <i className="mini-bar" />
      <i className="mini-bar" />
      <i className="mini-bar" />
      <i className="mini-bar" />
      <i className="mini-bar" />
    </div>
  );
}
