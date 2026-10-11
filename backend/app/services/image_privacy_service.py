import logging

from flask import current_app
from PIL import Image

logger = logging.getLogger(__name__)
_face_classifier = None


def strip_metadata(image):
    """Return a pixel-only copy: drops EXIF (including GPS), ICC and other metadata."""
    clean = Image.new(image.mode, image.size)
    clean.paste(image)
    clean.info = {}
    return clean


def _classifier():
    global _face_classifier
    if _face_classifier is None:
        import cv2

        path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        classifier = cv2.CascadeClassifier(path)
        _face_classifier = classifier if not classifier.empty() else False
    return _face_classifier


def blur_faces(image):
    """Blur detected faces with OpenCV when available. Returns (image, faces_blurred)."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return image, 0
    try:
        classifier = _classifier()
        if not classifier:
            return image, 0
        array = np.array(image.convert("RGB"))
        gray = cv2.cvtColor(array, cv2.COLOR_RGB2GRAY)
        faces = classifier.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(40, 40))
        for (x, y, w, h) in faces:
            kernel = max(31, w // 3) | 1
            region = array[y : y + h, x : x + w]
            array[y : y + h, x : x + w] = cv2.GaussianBlur(region, (kernel, kernel), 0)
        return Image.fromarray(array), len(faces)
    except Exception as exc:  # never block a report because privacy blurring failed
        logger.warning("Face blurring skipped: %s", exc)
        return image, 0


def protect(image):
    clean = strip_metadata(image)
    if current_app.config.get("ENABLE_FACE_BLUR"):
        return blur_faces(clean)
    return clean, 0
