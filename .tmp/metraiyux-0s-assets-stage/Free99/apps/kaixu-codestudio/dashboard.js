"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function fitCanvas(canvas){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx,width,height};
}

function drawBackground(){
  const canvas = $("#bg-canvas");
  if (!canvas) return;
  const {ctx,width,height} = fitCanvas(canvas);
  ctx.clearRect(0,0,width,height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,215,106,.07)";
  for(let x = -180; x < width + 220; x += 54){
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x + 240,height);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(0,234,255,.055)";
  for(let y = 70; y < height; y += 92){
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(width,y + 40);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,.18)";
  for(let i = 0; i < 80; i += 1){
    const x = (i * 137.5) % width;
    const y = (i * 97.25) % height;
    ctx.fillRect(x,y,1,1);
  }
}

function showToast(message){
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function wireCopyButtons(){
  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy') || '';
      try {
        await navigator.clipboard.writeText(value);
        showToast(`Copied: ${value}`);
      } catch {
        showToast(value);
      }
    });
  });
}

async function probeStaticHealth(){
  const target = $('#backend-status b');
  if (!target) return;
  try {
    const health = await fetch('./app/health.json', {cache:'no-store'}).then((res) => res.ok ? res.json() : null);
    if (health && health.version) target.textContent = `Bundle ${health.version}`;
  } catch {
    target.textContent = 'Static ready';
  }
}

function markActiveNav(){
  const links = $$('.topbar-actions a[href^="#"]');
  if (!links.length) return;
  const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.removeAttribute('aria-current'));
      const link = byId.get(entry.target.id);
      if (link) link.setAttribute('aria-current', 'page');
    });
  }, {rootMargin:'-35% 0px -55% 0px', threshold:0});
  byId.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

window.addEventListener('resize', drawBackground);
window.addEventListener('DOMContentLoaded', () => {
  drawBackground();
  wireCopyButtons();
  probeStaticHealth();
  markActiveNav();
});
