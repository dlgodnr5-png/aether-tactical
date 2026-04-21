import { animate, createTimeline, createSpring, stagger } from "animejs";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function bootTimeline(targets: (HTMLElement | null)[]) {
  const els = targets.filter(Boolean) as HTMLElement[];
  if (els.length === 0) return null;
  if (prefersReduced()) {
    els.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return null;
  }
  els.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(14px)";
    el.style.willChange = "transform, opacity";
  });
  return createTimeline({
    defaults: { ease: createSpring({ stiffness: 90, damping: 14, mass: 1 }) },
  }).add(els, {
    opacity: [0, 1],
    translateY: [14, 0],
    duration: 800,
    delay: stagger(80),
  });
}

export function numberTick(
  el: HTMLElement,
  from: number,
  to: number,
  opts?: { duration?: number; decimals?: number; suffix?: string }
) {
  const { duration = 700, decimals = 0, suffix = "" } = opts ?? {};
  if (prefersReduced()) {
    el.textContent = to.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix;
    return null;
  }
  const obj = { v: from };
  return animate(obj, {
    v: to,
    duration,
    ease: "outQuart",
    onUpdate: () => {
      el.textContent =
        obj.v.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }) + suffix;
    },
  });
}

export function magneticHover(el: HTMLElement, strength = 8) {
  if (prefersReduced()) return () => {};
  const rect = () => el.getBoundingClientRect();
  let raf = 0;
  const onMove = (e: PointerEvent) => {
    const r = rect();
    const mx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const my = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(raf);
    animate(el, {
      translateX: 0,
      translateY: 0,
      duration: 500,
      ease: createSpring({ stiffness: 140, damping: 12, mass: 1 }),
    });
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    cancelAnimationFrame(raf);
  };
}

export function tiltCard(el: HTMLElement, maxDeg = 8) {
  if (prefersReduced()) return () => {};
  el.style.transformStyle = "preserve-3d";
  el.style.transition = "transform 0.4s cubic-bezier(0.22,1,0.36,1)";
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = "transform 0.08s linear";
    el.style.transform = `perspective(900px) rotateY(${px * maxDeg}deg) rotateX(${-py * maxDeg}deg)`;
  };
  const onLeave = () => {
    el.style.transition = "transform 0.5s cubic-bezier(0.22,1,0.36,1)";
    el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  };
}

export function ripple(
  host: HTMLElement,
  x: number,
  y: number,
  color = "rgba(0,219,231,0.55)"
) {
  if (prefersReduced()) return;
  const r = host.getBoundingClientRect();
  const dot = document.createElement("span");
  const size = Math.max(r.width, r.height) * 2;
  dot.style.cssText = `position:absolute;left:${x - r.left - size / 2}px;top:${y - r.top - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${color};pointer-events:none;transform:scale(0);opacity:0.6;`;
  const prevPos = getComputedStyle(host).position;
  if (prevPos === "static") host.style.position = "relative";
  const prevOverflow = host.style.overflow;
  host.style.overflow = "hidden";
  host.appendChild(dot);
  animate(dot, {
    scale: [0, 1],
    opacity: [0.55, 0],
    duration: 650,
    ease: "outQuart",
    onComplete: () => {
      dot.remove();
      host.style.overflow = prevOverflow;
    },
  });
}

export function scrambleText(el: HTMLElement, target: string, duration = 600) {
  if (prefersReduced()) {
    el.textContent = target;
    return;
  }
  const chars = "!<>-_\\/[]{}—=+*^?#________";
  const steps = 20;
  const stepMs = duration / steps;
  let i = 0;
  const timer = window.setInterval(() => {
    let out = "";
    const progress = i / steps;
    for (let k = 0; k < target.length; k++) {
      if (k / target.length < progress) {
        out += target[k];
      } else {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    el.textContent = out;
    i++;
    if (i > steps) {
      window.clearInterval(timer);
      el.textContent = target;
    }
  }, stepMs);
}
