# Vision Morph Frontend

A production-ready React (Vite) frontend for the depth estimation backend in `depth_estimation.py`.

## Features
- Image upload (drag & drop + picker), preview and client-side validation
- Sends image to backend `/api/depth` (configurable backend URL)
- Shows original image, depth map (grayscale/colormap), object overlays
- Interactive Three.js point cloud viewer with OrbitControls
- Downloads for outputs (original/depth/3D/JSON when provided)
- Responsive Tailwind UI, accessible controls

## Requirements
- Node.js 18+
- Running backend exposing `POST /api/depth` that returns JSON with URLs for assets

## Getting Started

1) Install dependencies
```bash
cd frontend
npm install
```

2) Configure backend URL (optional)
- For local dev with backend at `http://localhost:8000`, no change needed (Vite proxy forwards `/api/*`).
- For a remote backend, create `.env` and set:
```bash
VITE_BACKEND_URL=https://your-backend.example.com
```

3) Run the app
```bash
npm run dev
```

## Expected Backend Response (example)
```json
{
  "original": "https://.../original.jpg",
  "depth_map": "https://.../depth_gray.png",
  "depth_map_colored": "https://.../depth_color.png",
  "ply_url": "https://.../cloud.ply",
  "gltf_url": "https://.../model.gltf",
  "objects": [
    { "bbox": [0, 0, 0, 0], "label": "person", "score": 0.98, "mask_url": "https://.../mask.png" }
  ],
  "json_url": "https://.../report.json"
}
```
Fields are flexible; the UI attempts to read common alternatives.

## Build & Deploy

Build a static site:
```bash
npm run build
```

- Vercel/Netlify: Deploy `frontend/` directory. Set env `VITE_BACKEND_URL` to your API base.
- Cloudflare Pages: Same; ensure CORS allowed on backend.

## Accessibility
- Keyboard-focusable controls, ARIA labels for interactive sections
- High-contrast theme; test with screen reader as needed

## Notes
- If the backend provides a mesh/PLY, you can extend `Depth3DViewer` to load those assets. Currently it generates a basic point cloud from the grayscale depth as a fallback.
