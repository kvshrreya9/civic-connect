import io

from PIL import Image, UnidentifiedImageError

from .validators import ApiError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_PIXELS = 40_000_000
MIN_DIMENSION = 32


def load_image(raw_bytes):
    """Verify and open an uploaded image. Returns (PIL.Image, original_format)."""
    try:
        with Image.open(io.BytesIO(raw_bytes)) as probe:
            image_format = probe.format
            probe.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise ApiError("Invalid or corrupted image file", 400)
    if image_format not in ALLOWED_FORMATS:
        raise ApiError("Only JPEG, PNG and WEBP images are allowed", 400)
    image = Image.open(io.BytesIO(raw_bytes))
    if image.width * image.height > MAX_PIXELS:
        raise ApiError("Image resolution is too large", 400)
    if min(image.width, image.height) < MIN_DIMENSION:
        raise ApiError("Image is too small to be useful", 400)
    image.load()
    return image, image_format


def ensure_rgb(image):
    if image.mode in ("RGBA", "LA", "P"):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[-1])
        return background
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def compute_dhash(image, size=8):
    """64-bit difference hash, hex encoded (16 chars). Mirrors the frontend implementation."""
    gray = image.convert("L").resize((size + 1, size), Image.LANCZOS)
    pixels = gray.tobytes()
    bits = 0
    for row in range(size):
        for col in range(size):
            left = pixels[row * (size + 1) + col]
            right = pixels[row * (size + 1) + col + 1]
            bits = (bits << 1) | (1 if left > right else 0)
    return f"{bits:016x}"


def hamming_distance(hash_a, hash_b):
    try:
        return bin(int(hash_a, 16) ^ int(hash_b, 16)).count("1")
    except (TypeError, ValueError):
        return 64


def is_valid_hash(value):
    if not value or len(value) != 16:
        return False
    try:
        int(value, 16)
        return True
    except ValueError:
        return False
