import os
import sys
import math
import qrcode
from PIL import Image

def generate_blended_qr(url, output_path, logo_path, box_size=16, border=4, dot_radius_ratio=0.33):
    # 1. Generate QR code matrix
    qr = qrcode.QRCode(
        version=6,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    matrix = qr.get_matrix()
    M = len(matrix)  # Total modules count (width + 2*border)
    active_width = M - 2 * border
    
    # Scale factor for anti-aliasing
    scale = 2
    S = box_size * scale
    R = int(S * dot_radius_ratio)
    W = M * S
    
    # 2. Load and crop the logo image
    if not os.path.exists(logo_path):
        raise FileNotFoundError(f"Logo image not found at {logo_path}")
        
    logo = Image.open(logo_path).convert("RGB")
    logo_w, logo_h = logo.size
    min_dim = min(logo_w, logo_h)
    left = (logo_w - min_dim) // 2
    top = (logo_h - min_dim) // 2
    logo_square = logo.crop((left, top, left + min_dim, top + min_dim))
    logo_resized = logo_square.resize((W, W), Image.Resampling.LANCZOS)
    
    # 3. Create the output image
    out_img = Image.new("RGB", (W, W))
    out_pixels = out_img.load()
    logo_pixels = logo_resized.load()
    
    gold_color = (184, 134, 11)   # #B8860B
    black_color = (10, 10, 10)     # Dark black for quiet zone/finder patterns
    
    for y in range(W):
        r = y // S
        for x in range(W):
            c = x // S
            
            # Check if we are in the quiet zone (border)
            if r < border or r >= border + active_width or c < border or c >= border + active_width:
                out_pixels[x, y] = black_color
                continue
                
            # Check if we are in a finder pattern
            is_finder = False
            dr, dc = 0, 0
            
            # Top-left finder
            if border <= r < border + 7 and border <= c < border + 7:
                is_finder = True
                dr, dc = r - border, c - border
            # Top-right finder
            elif border <= r < border + 7 and border + active_width - 7 <= c < border + active_width:
                is_finder = True
                dr, dc = r - border, c - (border + active_width - 7)
            # Bottom-left finder
            elif border + active_width - 7 <= r < border + active_width and border <= c < border + 7:
                is_finder = True
                dr, dc = r - (border + active_width - 7), c - border
                
            if is_finder:
                # Finder pattern drawing (7x7 modules)
                if dr == 0 or dr == 6 or dc == 0 or dc == 6:
                    out_pixels[x, y] = gold_color
                elif dr == 1 or dr == 5 or dc == 1 or dc == 5:
                    out_pixels[x, y] = black_color
                else:
                    out_pixels[x, y] = gold_color
                continue
                
            # Check if we are in a separator zone (1-module white border around finder)
            is_separator = False
            # Top-left separator
            if (r == border + 7 and border <= c < border + 8) or (c == border + 7 and border <= r < border + 8):
                is_separator = True
            # Top-right separator
            elif (r == border + 7 and border + active_width - 8 <= c < border + active_width) or (c == border + active_width - 8 and border <= r < border + 8):
                is_separator = True
            # Bottom-left separator
            elif (r == border + active_width - 8 and border <= c < border + 8) or (c == border + 7 and border + active_width - 8 <= r < border + active_width):
                is_separator = True
                
            if is_separator:
                out_pixels[x, y] = black_color
                continue
                
            # For all other modules, blend with the logo
            is_dark = matrix[r][c]
            logo_pixel = logo_pixels[x, y]
            
            # Compute logo pixel brightness (0-255)
            brightness = 0.299 * logo_pixel[0] + 0.587 * logo_pixel[1] + 0.114 * logo_pixel[2]
            logo_light = brightness > 50
            
            # Calculate distance to center of module
            cx = c * S + S // 2
            cy = r * S + S // 2
            dist_sq = (x - cx) ** 2 + (y - cy) ** 2
            
            if dist_sq < R ** 2:
                # Inside the dot
                if logo_light:
                    if not is_dark:
                        # Light module on light logo area -> draw black dot to make it dark
                        out_pixels[x, y] = black_color
                    else:
                        # Dark module on light logo area -> keep logo color (already light/gold)
                        out_pixels[x, y] = logo_pixel
                else:
                    if is_dark:
                        # Dark module on dark logo area -> draw gold dot to make it light
                        out_pixels[x, y] = gold_color
                    else:
                        # Light module on dark logo area -> keep logo color (already dark/black)
                        out_pixels[x, y] = logo_pixel
            else:
                # Outside the dot, keep logo color
                out_pixels[x, y] = logo_pixel
                
    # Resize down to 800x800 for high-quality anti-aliasing
    final_img = out_img.resize((800, 800), Image.Resampling.LANCZOS)
    final_img.save(output_path)
    print(f"Success! Saved blended QR code to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 generate_qr.py <url> <output_path> <logo_path>")
        sys.exit(1)
    url = sys.argv[1]
    output_path = sys.argv[2]
    logo_path = sys.argv[3]
    generate_blended_qr(url, output_path, logo_path)
