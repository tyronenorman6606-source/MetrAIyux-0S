import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

globalThis.gsap = gsap;
globalThis.ScrollTrigger = ScrollTrigger;
globalThis.Lenis = Lenis;
globalThis.SkyePayMotionStack = { gsap, ScrollTrigger, Lenis };
globalThis.dispatchEvent(new CustomEvent("skyepay:motion-stack-ready", {
  detail: globalThis.SkyePayMotionStack
}));
