"""
Image preprocessing service.
Handles background removal, resizing, and normalization
before the 3D model receives the image.
"""
import os
from pathlib import Path
from PIL import Image
import numpy as np


class ImageService:
    TARGET_SIZE = 512  # TripoSR expects 512x512

    def preprocess(self, image_path: str, output_dir: str) -> str:
        """
        Preprocess image for TripoSR:
        1. Open & convert to RGBA
        2. Remove background (rembg if available, else white bg)
        3. Resize to TARGET_SIZE x TARGET_SIZE
        4. Save preprocessed PNG

        Returns path to preprocessed image.
        """
        img = Image.open(image_path)

        # Convert to RGBA to handle transparency
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Attempt background removal via rembg (optional dependency)
        img = self._remove_background(img)

        # Resize keeping aspect ratio, pad to square
        img = self._resize_and_pad(img, self.TARGET_SIZE)

        out_path = str(Path(output_dir) / "preprocessed.png")
        img.save(out_path, "PNG")
        return out_path

    def _remove_background(self, img: Image.Image) -> Image.Image:
        """Try rembg for background removal; fall back gracefully."""
        try:
            from rembg import remove
            return remove(img)
        except ImportError:
            # rembg not installed – use original with alpha
            print("[ImageService] rembg not available, skipping background removal.")
            return img
        except Exception as e:
            print(f"[ImageService] Background removal failed: {e}. Continuing without.")
            return img

    def _resize_and_pad(self, img: Image.Image, size: int) -> Image.Image:
        """Resize to fit within size×size, center on white/transparent canvas."""
        img.thumbnail((size, size), Image.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        offset = ((size - img.width) // 2, (size - img.height) // 2)
        canvas.paste(img, offset, img if img.mode == "RGBA" else None)
        return canvas

    def get_dimensions(self, image_path: str) -> dict:
        """Return width/height of an image file."""
        with Image.open(image_path) as img:
            return {"width": img.width, "height": img.height}
