"""
FastAPI service exposing /api/depth using DepthEstimator from depth_estimation.py

POST /api/depth (multipart/form-data)
 - image: file (required)
 - mode: optional string (unused here, passed through for future use)

Returns JSON with data URLs for original, grayscale depth, and colored depth.
"""
import io
import base64
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import cv2

from pathlib import Path
import os
import traceback
import sys

# Ensure we can import depth_estimation.py from project root
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

try:
    from depth_estimation import DepthEstimator  # noqa: E402
    _HAS_FULL_ESTIMATOR = True
except Exception:
    DepthEstimator = None  # type: ignore
    _HAS_FULL_ESTIMATOR = False

app = FastAPI(title="Vision Morph Depth API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def image_to_data_url(img: Image.Image, format_: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=format_)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    mime = f"image/{format_.lower()}"
    return f"data:{mime};base64,{b64}"


def array_to_data_url(arr: np.ndarray, colormap: Optional[int] = None) -> str:
    if arr.ndim == 2:
        img = (arr * 255).clip(0, 255).astype(np.uint8)
        if colormap is not None:
            cm = cv2.applyColorMap(img, colormap)
            pil = Image.fromarray(cv2.cvtColor(cm, cv2.COLOR_BGR2RGB))
        else:
            pil = Image.fromarray(img)
    else:
        pil = Image.fromarray(arr)
    return image_to_data_url(pil)


@app.post("/api/depth")
async def api_depth(image: UploadFile = File(...), mode: Optional[str] = Form(None)):
    try:
        # Basic validation
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if image.content_type not in allowed_types:
            raise HTTPException(status_code=415, detail=f"Unsupported file type {image.content_type}. Use JPG, PNG, or WEBP.")

        content = await image.read()
        if not content or len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Max 10 MB.")
        pil = Image.open(io.BytesIO(content)).convert("RGB")

        if _HAS_FULL_ESTIMATOR and DepthEstimator is not None:
            estimator = DepthEstimator()
            estimator.original_image = pil
            depth = estimator.estimate_depth()
        else:
            # Lightweight fallback without torch/transformers
            arr = np.array(pil)
            if arr.ndim == 3:
                gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
            else:
                gray = arr
            blurred = cv2.GaussianBlur(gray, (15, 15), 0)
            kernel = np.ones((5, 5), np.float32) / 25
            local_mean = cv2.filter2D(blurred.astype(np.float32), -1, kernel)
            local_variance = cv2.filter2D((blurred.astype(np.float32) - local_mean) ** 2, -1, kernel)
            depth = 1.0 - cv2.normalize(local_variance, None, 0, 1, cv2.NORM_MINMAX)
            depth = cv2.GaussianBlur(depth, (5, 5), 0)

        gray_url = array_to_data_url(depth, colormap=None)
        color_url = array_to_data_url(depth, colormap=cv2.COLORMAP_VIRIDIS)
        original_url = image_to_data_url(pil, format_="JPEG")

        # Stub objects; replace with your detection output if available
        objects = []

        return JSONResponse({
            "original": original_url,
            "depth_map": gray_url,
            "depth_map_colored": color_url,
            "objects": objects,
        })
    except Exception as e:
        debug = os.environ.get("DEBUG", "").lower() in {"1", "true", "yes"}
        payload = {"message": str(e)}
        if debug:
            payload["trace"] = traceback.format_exc()
        status = e.status_code if isinstance(e, HTTPException) else 400
        return JSONResponse(payload, status_code=status)


@app.get("/health")
def health():
    return {"status": "ok"}


