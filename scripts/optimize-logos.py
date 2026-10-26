import os
from PIL import Image

def optimize_image(src_path, dest_paths, max_dimension=600):
    if not os.path.exists(src_path):
        print(f"File not found: {src_path}")
        return
    
    orig_size = os.path.getsize(src_path)
    img = Image.open(src_path)
    print(f"Original {src_path}: size={orig_size} bytes, dimensions={img.size}, mode={img.mode}")
    
    # Resize preserving aspect ratio
    width, height = img.size
    if width > max_dimension or height > max_dimension:
        if width > height:
            new_width = max_dimension
            new_height = int(height * (max_dimension / width))
        else:
            new_height = max_dimension
            new_width = int(width * (max_dimension / height))
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        print(f"Resized to {img.size}")
    
    # Save optimized PNG
    for dest_path in dest_paths:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        img.save(dest_path, format="PNG", optimize=True)
        new_size = os.path.getsize(dest_path)
        reduction = round((1 - new_size/orig_size)*100, 1)
        print(f"Saved optimized to {dest_path}: {new_size} bytes (reduced by {reduction}%)")

if __name__ == "__main__":
    asc_destinations = [
        os.path.join("public", "asclogo.png"),
        os.path.join("public", "assets", "img", "asclogo.png"),
        os.path.join("assets", "img", "asclogo.png")
    ]
    optimize_image(os.path.join("public", "asclogo.png"), asc_destinations, max_dimension=512)

    asts_destinations = [
        os.path.join("public", "astslogo.png"),
        os.path.join("public", "assets", "img", "astslogo.png"),
        os.path.join("assets", "img", "astslogo.png"),
        os.path.join("ASTS", "assets", "img", "astslogo.png")
    ]
    optimize_image(os.path.join("public", "astslogo.png"), asts_destinations, max_dimension=512)
