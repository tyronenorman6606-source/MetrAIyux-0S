from __future__ import annotations

import math
import random
from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path("Skye-Clients/bobs-smoke-shop-mcp-redo")
ASSETS = ROOT / "assets"
VIDEOS = ASSETS / "videos"
OUT_MP4 = VIDEOS / "bobs-cinematic-logo-hero.mp4"
OUT_POSTER = VIDEOS / "bobs-cinematic-logo-hero-poster.jpg"

WIDTH = 1280
HEIGHT = 720
FPS = 24
DURATION = 30.0
SCENE_DURATION = 5.0
TRANSITION = 0.72
FRAME_COUNT = int(FPS * DURATION)
RNG = random.Random(132013)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT_HERO = font(72, True)
FONT_SCENE = font(38, True)
FONT_MED = font(26, True)
FONT_SMALL = font(19, True)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def ease_out_cubic(x: float) -> float:
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in_out(x: float) -> float:
    x = clamp(x)
    return x * x * (3 - 2 * x)


def load(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def cover(img: Image.Image, width: int, height: int, zoom: float = 1.0, x_bias: float = 0.5, y_bias: float = 0.5) -> Image.Image:
    src = img.convert("RGB")
    scale = max(width / src.width, height / src.height) * zoom
    new_size = (max(1, int(src.width * scale)), max(1, int(src.height * scale)))
    resized = src.resize(new_size, Image.Resampling.LANCZOS)
    left = int((new_size[0] - width) * clamp(x_bias))
    top = int((new_size[1] - height) * clamp(y_bias))
    return resized.crop((left, top, left + width, top + height)).convert("RGBA")


def contain(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    scale = min(max_w / img.width, max_h / img.height)
    return img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.Resampling.LANCZOS)


def paste_alpha(base: Image.Image, img: Image.Image, xy: tuple[int, int], opacity: float = 1.0) -> None:
    overlay = img.convert("RGBA")
    if opacity < 0.999:
        alpha = overlay.getchannel("A").point(lambda v: int(v * clamp(opacity)))
        overlay.putalpha(alpha)
    base.alpha_composite(overlay, xy)


def add_glow(layer: Image.Image, box: tuple[int, int, int, int], color: tuple[int, int, int, int], blur: int) -> None:
    glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow, "RGBA")
    draw.ellipse(box, fill=color)
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    layer.alpha_composite(glow)


def draw_center(draw: ImageDraw.ImageDraw, text: str, y: int, ft: ImageFont.FreeTypeFont, fill: tuple[int, int, int, int]) -> None:
    bbox = draw.textbbox((0, 0), text, font=ft)
    draw.text(((WIDTH - (bbox[2] - bbox[0])) // 2, y), text, font=ft, fill=fill)


logo = load(ASSETS / "logo" / "bobs-smoke-shop-3d-logo.png")
storefront = load(ASSETS / "banners" / "storefront-hero-banner.png")
interior = load(ASSETS / "banners" / "interior-showcase-banner.png")
live_storefront = load(ASSETS / "live-site" / "bobs-live-storefront.png")
glass_color = load(ASSETS / "live-site" / "live-glass-color.png")
glass_green = load(ASSETS / "live-site" / "live-glass-green.png")
device = load(ASSETS / "live-site" / "live-product-g-device.png")
wraps = load(ASSETS / "live-site" / "live-wraps-display.jpeg")
cigars = load(ASSETS / "live-site" / "live-cigars.jpeg")
zemis = load(ASSETS / "live-site" / "live-zemis-wraps.jpeg")
stiiizy = load(ASSETS / "live-site" / "live-stiiizy-wraps.jpg")
snacks = load(ASSETS / "inventory" / "exotic-snacks.png")
hookah = load(ASSETS / "inventory" / "hookah.png")

SCENES = [
    {
        "label": "LITCHFIELD PARK SMOKE SHOP",
        "sub": "Open daily 8 AM - 12 AM",
        "bg": live_storefront,
        "items": [(logo, "center-logo"), (storefront, "wide-photo")],
        "x": (0.46, 0.52),
        "y": (0.46, 0.48),
    },
    {
        "label": "BLUE-LIT SHOP EXPERIENCE",
        "sub": "Glass, vapes, cigars, hookah, snacks",
        "bg": interior,
        "items": [(glass_color, "left-tall"), (device, "right-tall")],
        "x": (0.44, 0.56),
        "y": (0.48, 0.50),
    },
    {
        "label": "GLASS AND VAPE WALL",
        "sub": "Color, pieces, devices, accessories",
        "bg": storefront,
        "items": [(glass_green, "left-tall"), (glass_color, "center-tall"), (device, "right-tall")],
        "x": (0.40, 0.54),
        "y": (0.48, 0.50),
    },
    {
        "label": "WRAPS, CIGARS, PAPERS",
        "sub": "Quick visual pass through the counter favorites",
        "bg": interior,
        "items": [(wraps, "left-wide"), (cigars, "center-wide"), (zemis, "right-wide")],
        "x": (0.50, 0.45),
        "y": (0.50, 0.52),
    },
    {
        "label": "HOOKAH AND EXOTIC SNACKS",
        "sub": "Retail color, shelf energy, and late-night grabs",
        "bg": storefront,
        "items": [(hookah, "left-square"), (snacks, "right-square"), (stiiizy, "center-wide")],
        "x": (0.54, 0.48),
        "y": (0.52, 0.50),
    },
    {
        "label": "BOB'S SMOKE SHOP",
        "sub": "5115 N Dysart Rd, Unit 214 - 21+ only",
        "bg": live_storefront,
        "items": [(logo, "final-logo"), (glass_color, "left-tall"), (device, "right-tall")],
        "x": (0.46, 0.52),
        "y": (0.46, 0.48),
    },
]

spark_points = [
    (RNG.uniform(0, WIDTH), RNG.uniform(0, HEIGHT), RNG.uniform(0.4, 1.0), RNG.uniform(0.6, 1.9))
    for _ in range(160)
]
smoke_bands = [
    (RNG.uniform(-160, WIDTH + 160), RNG.uniform(160, HEIGHT + 180), RNG.uniform(150, 380), RNG.uniform(0.12, 0.32), RNG.uniform(-1.5, 1.5))
    for _ in range(34)
]


def draw_product(base: Image.Image, img: Image.Image, style: str, p: float, t: float, idx: int) -> None:
    entrance = ease_out_cubic((p * 1.5) - idx * 0.09)
    wobble = math.sin(t * 0.55 + idx * 1.7)
    if "logo" in style:
        max_w = int(WIDTH * (0.42 if style == "center-logo" else 0.54))
        max_h = int(HEIGHT * (0.48 if style == "center-logo" else 0.62))
        card = contain(img, max_w, max_h)
        x = (WIDTH - card.width) // 2 + int(wobble * 5)
        y = int(HEIGHT * (0.38 if style == "center-logo" else 0.36) - card.height / 2 + math.sin(t * 0.7) * 6)
        shadow = card.filter(ImageFilter.GaussianBlur(18))
        paste_alpha(base, shadow, (x + 7, y + 14), 0.55 * entrance)
        paste_alpha(base, card, (x, y), entrance)
        return

    if style == "wide-photo":
        card = cover(img, 470, 265, 1.05 + p * 0.04, 0.50, 0.50)
        x = WIDTH - card.width - 54 + int(wobble * 8)
        y = 126 + int(math.cos(t * 0.45) * 7)
    elif style.endswith("tall"):
        card = contain(img, 250 if "center" not in style else 290, 360)
        if style.startswith("left"):
            x = 70 + int(wobble * 14)
        elif style.startswith("right"):
            x = WIDTH - card.width - 72 + int(wobble * 14)
        else:
            x = (WIDTH - card.width) // 2 + int(wobble * 10)
        y = 210 + idx * 16 + int(math.cos(t * 0.45 + idx) * 10)
    elif style.endswith("wide"):
        card = cover(img, 360, 240, 1.04 + p * 0.03, 0.50, 0.50)
        slots = [88, (WIDTH - 360) // 2, WIDTH - 448]
        x = slots[min(idx, 2)] + int(wobble * 9)
        y = 250 + int(math.cos(t * 0.5 + idx) * 10)
    else:
        card = contain(img, 310, 310)
        x = (118 if style.startswith("left") else WIDTH - card.width - 118) + int(wobble * 10)
        y = 230 + int(math.cos(t * 0.5 + idx) * 10)

    card = ImageEnhance.Contrast(card).enhance(1.07)
    card = ImageEnhance.Color(card).enhance(1.08)
    if not style.endswith("tall"):
        frame = Image.new("RGBA", (card.width + 20, card.height + 20), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame, "RGBA")
        draw.rounded_rectangle((0, 0, frame.width - 1, frame.height - 1), radius=20, fill=(3, 12, 22, 210), outline=(99, 220, 255, 110), width=2)
        frame.alpha_composite(card, (10, 10))
        card = frame
    shadow = card.filter(ImageFilter.GaussianBlur(16))
    paste_alpha(base, shadow, (x + 8, y + 14), 0.32 * entrance)
    paste_alpha(base, card, (x, y), 0.86 * entrance)


def add_atmosphere(base: Image.Image, t: float, global_p: float) -> None:
    grade = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    add_glow(grade, (-220, -170, 570, 520), (0, 155, 255, 82), 78)
    add_glow(grade, (760, -170, 1500, 520), (255, 156, 58, 46), 96)
    add_glow(grade, (270, 270, 980, 950), (0, 220, 255, 42), 92)
    base.alpha_composite(grade)

    smoke = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(smoke, "RGBA")
    for sx, sy, sw, alpha, drift in smoke_bands:
        x = sx + math.sin(t * 0.34 + drift) * 42
        y = ((sy - global_p * HEIGHT * 1.7) % (HEIGHT + 220)) - 80
        h = sw * (1.12 + math.sin(t * 0.55 + drift) * 0.18)
        draw.ellipse((x - sw / 2, y - h / 2, x + sw / 2, y + h / 2), fill=(170, 225, 255, int(100 * alpha)))
    smoke = smoke.filter(ImageFilter.GaussianBlur(32))
    base.alpha_composite(smoke)

    sparks = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sparks, "RGBA")
    for sx, sy, speed, size in spark_points:
        x = (sx + global_p * WIDTH * speed * 0.30) % WIDTH
        y = (sy - global_p * HEIGHT * speed * 1.10) % HEIGHT
        flicker = 0.35 + 0.65 * ((math.sin(t * 6.0 + sx * 0.01) + 1) / 2)
        draw.ellipse((x, y, x + size * 2.3, y + size * 2.3), fill=(255, 200, 92, int(90 * flicker)))
    base.alpha_composite(sparks.filter(ImageFilter.GaussianBlur(0.6)))


def render_scene(scene_index: int, local_p: float, t: float, global_p: float) -> Image.Image:
    scene = SCENES[scene_index % len(SCENES)]
    x_start, x_end = scene["x"]
    y_start, y_end = scene["y"]
    wave = math.sin(t * 0.42 + scene_index)
    bg = cover(
        scene["bg"],
        WIDTH,
        HEIGHT,
        1.04 + local_p * 0.075,
        x_start + (x_end - x_start) * ease_in_out(local_p) + wave * 0.012,
        y_start + (y_end - y_start) * ease_in_out(local_p),
    )
    bg = ImageEnhance.Color(bg).enhance(1.18)
    bg = ImageEnhance.Contrast(bg).enhance(1.20)
    bg = ImageEnhance.Brightness(bg).enhance(0.66)
    base = bg.convert("RGBA")
    add_atmosphere(base, t, global_p)

    for idx, (img, style) in enumerate(scene["items"]):
        draw_product(base, img, style, local_p, t, idx)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    draw.rectangle((0, 0, WIDTH, 112), fill=(0, 0, 0, 58))
    draw.rectangle((0, HEIGHT - 174, WIDTH, HEIGHT), fill=(0, 0, 0, 98))
    draw.rectangle((0, 0, WIDTH, HEIGHT), outline=(90, 220, 255, 60), width=3)
    entrance = ease_out_cubic(local_p / 0.24)
    draw_center(draw, scene["label"], HEIGHT - 152, FONT_SCENE if scene_index else FONT_HERO, (246, 252, 255, int(242 * entrance)))
    draw_center(draw, scene["sub"], HEIGHT - 88, FONT_MED, (119, 222, 255, int(228 * entrance)))
    draw_center(draw, "21+ ONLY | LITCHFIELD PARK, AZ", 42, FONT_SMALL, (255, 210, 112, int(210 * entrance)))
    base.alpha_composite(overlay)
    return base.convert("RGB")


def render_frame(index: int) -> Image.Image:
    t = index / FPS
    global_p = index / max(1, FRAME_COUNT - 1)
    scene_float = t / SCENE_DURATION
    scene_index = int(scene_float) % len(SCENES)
    local_time = t - (int(scene_float) * SCENE_DURATION)
    local_p = local_time / SCENE_DURATION
    current = render_scene(scene_index, local_p, t, global_p)
    if local_time > SCENE_DURATION - TRANSITION:
        blend_p = ease_in_out((local_time - (SCENE_DURATION - TRANSITION)) / TRANSITION)
        next_scene = render_scene(scene_index + 1, 0.02 + blend_p * 0.18, t, global_p)
        current = Image.blend(current, next_scene, blend_p)
    return current


def main() -> None:
    VIDEOS.mkdir(parents=True, exist_ok=True)
    poster_frame = int(FPS * 3.4)
    with imageio.get_writer(
        OUT_MP4,
        fps=FPS,
        codec="libx264",
        macro_block_size=16,
        ffmpeg_params=[
            "-pix_fmt",
            "yuv420p",
            "-profile:v",
            "baseline",
            "-level",
            "3.1",
            "-movflags",
            "+faststart",
            "-b:v",
            "1850k",
            "-maxrate",
            "2100k",
            "-bufsize",
            "3800k",
            "-an",
        ],
    ) as writer:
        for index in range(FRAME_COUNT):
            frame = render_frame(index)
            if index == poster_frame:
                frame.save(OUT_POSTER, quality=88, optimize=True, progressive=True)
            writer.append_data(np.asarray(frame))
    if not OUT_POSTER.exists():
        render_frame(poster_frame).save(OUT_POSTER, quality=88, optimize=True, progressive=True)
    print(f"wrote {OUT_MP4} ({OUT_MP4.stat().st_size} bytes)")
    print(f"wrote {OUT_POSTER} ({OUT_POSTER.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
