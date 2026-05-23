import React from "react";
import "./kaixu-drop-in.css";

const CROWN = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\" role=\"img\" aria-label=\"sovereign crown icon\"> <defs> <radialGradient id=\"hot\" cx=\"32%\" cy=\"20%\" r=\"80%\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\".25\" stop-color=\"#8a35ff\"/><stop offset=\".65\" stop-color=\"#35f7ff\"/><stop offset=\"1\" stop-color=\"#a6ff4d\"/></radialGradient> <linearGradient id=\"face\" x1=\"18\" y1=\"12\" x2=\"112\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#8a35ff\"/><stop offset=\".42\" stop-color=\"#35f7ff\"/><stop offset=\"1\" stop-color=\"#a6ff4d\"/></linearGradient> <filter id=\"glow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"4\" result=\"blur\"/><feColorMatrix in=\"blur\" type=\"matrix\" values=\"1 0 0 0 0.5 0 1 0 0 0.2 0 0 1 0 1 0 0 0 .75 0\" result=\"glow\"/><feMerge><feMergeNode in=\"glow\"/><feMergeNode in=\"SourceGraphic\"/></feMerge></filter> </defs> <ellipse cx=\"64\" cy=\"108\" rx=\"39\" ry=\"10\" fill=\"rgba(0,0,0,.34)\"/> <g filter=\"url(#glow)\" transform=\"rotate(18 64 64)\"> <circle cx=\"21\" cy=\"25\" r=\"16\" fill=\"#35f7ff\" opacity=\".45\"/> <circle cx=\"78\" cy=\"31\" r=\"18\" fill=\"#8a35ff\" opacity=\".34\"/> <path d=\"M25 89l8-50 22 24 13-33 16 33 22-24 7 50z\" fill=\"url(#face)\" stroke=\"rgba(255,255,255,.60)\" stroke-width=\"4\" stroke-linejoin=\"round\"/><circle cx=\"33\" cy=\"39\" r=\"7\" fill=\"url(#hot)\"/><circle cx=\"68\" cy=\"29\" r=\"7\" fill=\"white\"/><circle cx=\"106\" cy=\"39\" r=\"7\" fill=\"url(#hot)\"/> <path d=\"M35 31c18-12 40-13 59 0\" stroke=\"white\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".28\"/> </g> </svg>";
const BRAIN = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\" role=\"img\" aria-label=\"ai brain icon\"> <defs> <radialGradient id=\"hot\" cx=\"32%\" cy=\"20%\" r=\"80%\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\".25\" stop-color=\"#35f7ff\"/><stop offset=\".65\" stop-color=\"#ff3dc8\"/><stop offset=\"1\" stop-color=\"#8a35ff\"/></radialGradient> <linearGradient id=\"face\" x1=\"18\" y1=\"12\" x2=\"112\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#35f7ff\"/><stop offset=\".42\" stop-color=\"#ff3dc8\"/><stop offset=\"1\" stop-color=\"#8a35ff\"/></linearGradient> <filter id=\"glow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"4\" result=\"blur\"/><feColorMatrix in=\"blur\" type=\"matrix\" values=\"1 0 0 0 0.5 0 1 0 0 0.2 0 0 1 0 1 0 0 0 .75 0\" result=\"glow\"/><feMerge><feMergeNode in=\"glow\"/><feMergeNode in=\"SourceGraphic\"/></feMerge></filter> </defs> <ellipse cx=\"64\" cy=\"108\" rx=\"39\" ry=\"10\" fill=\"rgba(0,0,0,.34)\"/> <g filter=\"url(#glow)\" transform=\"rotate(-9 64 64)\"> <circle cx=\"14\" cy=\"18\" r=\"16\" fill=\"#ff3dc8\" opacity=\".45\"/> <circle cx=\"74\" cy=\"24\" r=\"18\" fill=\"#35f7ff\" opacity=\".34\"/> <path d=\"M44 39c-14 5-20 24-9 35-8 18 11 35 27 25 14 11 35 0 34-18 17-12 10-38-9-42-6-20-33-19-43 0z\" fill=\"url(#face)\" stroke=\"rgba(255,255,255,.55)\" stroke-width=\"3\"/><path d=\"M42 66h44M54 43v50M74 43v50M39 77c15-4 35-4 50 0\" stroke=\"white\" stroke-width=\"4\" stroke-linecap=\"round\" opacity=\".74\"/> <path d=\"M35 31c18-12 40-13 59 0\" stroke=\"white\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".28\"/> </g> </svg>";
const MIC = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\" role=\"img\" aria-label=\"artist mic icon\"> <defs> <radialGradient id=\"hot\" cx=\"32%\" cy=\"20%\" r=\"80%\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\".25\" stop-color=\"#8a35ff\"/><stop offset=\".65\" stop-color=\"#35f7ff\"/><stop offset=\"1\" stop-color=\"#a6ff4d\"/></radialGradient> <linearGradient id=\"face\" x1=\"18\" y1=\"12\" x2=\"112\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#8a35ff\"/><stop offset=\".42\" stop-color=\"#35f7ff\"/><stop offset=\"1\" stop-color=\"#a6ff4d\"/></linearGradient> <filter id=\"glow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"4\" result=\"blur\"/><feColorMatrix in=\"blur\" type=\"matrix\" values=\"1 0 0 0 0.5 0 1 0 0 0.2 0 0 1 0 1 0 0 0 .75 0\" result=\"glow\"/><feMerge><feMergeNode in=\"glow\"/><feMergeNode in=\"SourceGraphic\"/></feMerge></filter> </defs> <ellipse cx=\"64\" cy=\"108\" rx=\"39\" ry=\"10\" fill=\"rgba(0,0,0,.34)\"/> <g filter=\"url(#glow)\" transform=\"rotate(8 64 64)\"> <circle cx=\"16\" cy=\"20\" r=\"16\" fill=\"#35f7ff\" opacity=\".45\"/> <circle cx=\"78\" cy=\"26\" r=\"18\" fill=\"#8a35ff\" opacity=\".34\"/> <circle cx=\"64\" cy=\"64\" r=\"38\" fill=\"url(#face)\" stroke=\"rgba(255,255,255,.55)\" stroke-width=\"3\"/><path d=\"M45 71c7-22 12-22 19 0s12 22 19 0\" fill=\"none\" stroke=\"white\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M64 29v68\" stroke=\"rgba(255,255,255,.45)\" stroke-width=\"3\"/> <path d=\"M35 31c18-12 40-13 59 0\" stroke=\"white\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".28\"/> </g> </svg>";

function InlineSvg({ svg, className = "kx-icon" }) {
  return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function KxButton({ children = "Launch System", dark = false }) {
  return <button className={`kx-btn ${dark ? "dark" : ""}`}>{children}</button>;
}

export function KxNav() {
  return <nav className="kx-nav">
    <div className="kx-brand"><span className="kx-brand-mark"><InlineSvg svg={CROWN} className="" /></span><span>Kaixu Interface</span></div>
    <div className="kx-nav-links"><a href="#work">Work</a><a href="#systems">Systems</a><a href="#contact">Contact</a></div>
  </nav>;
}

export function KxHero() {
  return <section className="kx-hero">
    <div>
      <span className="kx-eyebrow">Personal Design Arsenal</span>
      <h1 className="kx-title">Build every surface with your own visual gravity.</h1>
      <p className="kx-copy">A trippy 3D interface language for apps, portals, portfolios, pitch pages, game menus, music pages, and command centers.</p>
      <div className="kx-actions"><KxButton /> <KxButton dark>View Components</KxButton></div>
    </div>
    <div className="kx-orb" />
  </section>;
}

export function KxFeatureGrid() {
  return <section className="kx-grid">
    <article className="kx-card"><InlineSvg svg={BRAIN} /><h3>AI Systems</h3><p>Use for AI apps, dashboards, automations, and internal operators.</p></article>
    <article className="kx-card"><InlineSvg svg={MIC} /><h3>Artist Surfaces</h3><p>Use for artist pages, releases, fan portals, and direct monetization.</p></article>
    <article className="kx-card"><InlineSvg svg={CROWN} /><h3>Sovereign Brand</h3><p>Use for founder pages, brand portals, and enterprise offers.</p></article>
  </section>;
}

export default function KaixuPage() {
  return <main className="kx-shell"><KxNav /><KxHero /><KxFeatureGrid /></main>;
}
