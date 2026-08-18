import os
from PIL import Image, ImageFilter
import numpy as np

os.makedirs('front-end/public/images/seamless', exist_ok=True)

def create_seamless_hero_image(input_path, output_path, target_size=(1450, 1085), fade_margin=(120, 120, 120, 120)):
    img = Image.open(input_path).convert('RGBA')
    
    # 1. Resize to target_size with high quality Lanczos filter
    img = img.resize(target_size, Image.Resampling.LANCZOS)
    w, h = target_size
    arr = np.array(img, dtype=np.float32)
    
    # 2. Build hero dark navy background matching radial gradient:
    # circle at (72% w, 38% h) -> #152238 (21, 34, 56) to #060e1d (6, 14, 29) to #020712 (2, 7, 18)
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    cx, cy = int(w * 0.72), int(h * 0.38)
    dist = np.sqrt(((x_coords - cx) / w)**2 + ((y_coords - cy) / h)**2)
    max_d = 1.0
    norm_dist = np.clip(dist / max_d, 0, 1)
    
    # Interpolate colors for navy background
    c0 = np.array([21, 34, 56], dtype=np.float32) # #152238
    c1 = np.array([6, 14, 29], dtype=np.float32)  # #060e1d
    c2 = np.array([2, 7, 18], dtype=np.float32)   # #020712
    
    bg_rgb = np.zeros((h, w, 3), dtype=np.float32)
    mask1 = norm_dist < 0.55
    t1 = norm_dist / 0.55
    bg_rgb[mask1] = (1 - t1[mask1, None]) * c0 + t1[mask1, None] * c1
    
    mask2 = ~mask1
    t2 = (norm_dist - 0.55) / 0.45
    bg_rgb[mask2] = (1 - t2[mask2, None]) * c1 + t2[mask2, None] * c2

    # 3. Create smooth edge fade mask (0 at borders -> 1 in center)
    top_m, bot_m, left_m, right_m = fade_margin
    
    # X fade
    fx = np.ones(w, dtype=np.float32)
    fx[:left_m] = np.sin(np.linspace(0, np.pi/2, left_m))**2
    fx[-right_m:] = np.cos(np.linspace(0, np.pi/2, right_m))**2
    
    # Y fade
    fy = np.ones(h, dtype=np.float32)
    fy[:top_m] = np.sin(np.linspace(0, np.pi/2, top_m))**2
    fy[-bot_m:] = np.cos(np.linspace(0, np.pi/2, bot_m))**2
    
    alpha_mask = np.outer(fy, fx)
    
    # In addition, rounded superellipse corner falloff
    ellipse_x = (x_coords - w/2) / (w/2)
    ellipse_y = (y_coords - h/2) / (h/2)
    r_corner = np.sqrt(np.abs(ellipse_x)**4 + np.abs(ellipse_y)**4)
    corner_falloff = np.clip(1.0 - np.maximum(0, (r_corner - 0.65) / 0.35), 0, 1)
    corner_falloff = np.sin(corner_falloff * np.pi / 2)**2
    
    final_alpha = alpha_mask * corner_falloff
    
    # Blend image with background near edges where alpha starts dropping
    blend_weight = final_alpha[:, :, None]
    blended_rgb = arr[:, :, :3] * blend_weight + bg_rgb * (1 - blend_weight)
    
    result = np.zeros((h, w, 4), dtype=np.uint8)
    result[:, :, :3] = np.clip(blended_rgb, 0, 255).astype(np.uint8)
    result[:, :, 3] = np.clip(final_alpha * 255, 0, 255).astype(np.uint8)
    
    out_img = Image.fromarray(result, 'RGBA')
    out_img.save(output_path, 'PNG', optimize=True)
    print(f'Saved {output_path}: size={out_img.size}')

if __name__ == '__main__':
    for key in ['koc', 'business', 'marketplace', 'aiclone', 'pricing', 'community']:
        create_seamless_hero_image(
            f'front-end/public/images/raw/{key}.jpg',
            f'front-end/public/images/seamless/{key}-hero-seamless.png',
            target_size=(1450, 1085),
            fade_margin=(140, 140, 140, 140)
        )
