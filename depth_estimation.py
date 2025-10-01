"""
Depth estimation module using MiDaS and other deep learning models.
This module provides more sophisticated 2D to 3D conversion using depth estimation.
"""

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import trimesh
import pyvista as pv
from transformers import pipeline
import warnings
warnings.filterwarnings("ignore")


class DepthEstimator:
    """Depth estimation using various deep learning models."""
    
    def __init__(self, model_name="LiheYoung/depth-anything-large", enable_refine: bool = False):
        """
        Initialize depth estimator.
        
        Args:
            model_name: Hugging Face model name for depth estimation
        """
        self.model_name = model_name
        self.depth_pipeline = None
        self.original_image = None
        self.depth_map = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        self.enable_refine = enable_refine
        
    def load_model(self):
        """Load the depth estimation model."""
        try:
            print(f"Loading depth estimation model: {self.model_name}")
            self.depth_pipeline = pipeline(
                "depth-estimation", 
                model=self.model_name,
                device=0 if self.device == "cuda" else -1
            )
            print("Model loaded successfully!")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            print("Falling back to alternative method...")
            return False
    
    def load_image(self, image_path):
        """Load image from file path."""
        try:
            self.original_image = Image.open(image_path).convert("RGB")
            return True
        except Exception as e:
            print(f"Error loading image: {e}")
            return False
    
    def estimate_depth(self, image=None):
        """
        Estimate depth from image.
        
        Args:
            image: PIL Image or None to use loaded image
        """
        if image is None:
            image = self.original_image
        
        if image is None:
            raise ValueError("No image provided or loaded")
        
        if self.depth_pipeline is None:
            if not self.load_model():
                # Fallback to simple depth estimation
                return self._simple_depth_estimation(image)
        
        try:
            # Use the loaded model
            result = self.depth_pipeline(image)
            depth_map = np.array(result["depth"])
            
            # Normalize depth map
            self.depth_map = cv2.normalize(depth_map.astype(np.float32), None, 0, 1, cv2.NORM_MINMAX)
            
            # Optional edge-aware refinement
            if self.enable_refine and self.original_image is not None:
                self.depth_map = self._refine_depth_edge_aware(self.depth_map, np.array(self.original_image))
            return self.depth_map
            
        except Exception as e:
            print(f"Error in depth estimation: {e}")
            print("Falling back to simple depth estimation...")
            return self._simple_depth_estimation(image)
    
    def _simple_depth_estimation(self, image):
        """Simple depth estimation using edge detection and blur."""
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (15, 15), 0)
        
        # Calculate depth based on local variance
        kernel = np.ones((5, 5), np.float32) / 25
        local_mean = cv2.filter2D(blurred.astype(np.float32), -1, kernel)
        local_variance = cv2.filter2D((blurred.astype(np.float32) - local_mean) ** 2, -1, kernel)
        
        # Invert so that high variance (edges) are closer
        depth = 1.0 - cv2.normalize(local_variance, None, 0, 1, cv2.NORM_MINMAX)
        
        # Apply additional smoothing
        depth = cv2.GaussianBlur(depth, (5, 5), 0)
        
        # Optional refinement even for simple mode
        self.depth_map = depth
        if self.enable_refine and image is not None:
            self.depth_map = self._refine_depth_edge_aware(self.depth_map, np.array(image))
        return self.depth_map

    def _refine_depth_edge_aware(self, depth: np.ndarray, rgb: np.ndarray) -> np.ndarray:
        """Refine depth with edge-aware filtering guided by RGB image.
        Uses joint bilateral-like filtering to sharpen boundaries.
        """
        try:
            if rgb.ndim == 3 and rgb.shape[2] == 3:
                guide = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
            else:
                guide = rgb.astype(np.uint8)
            guide = cv2.GaussianBlur(guide, (0, 0), 1.0)
            # Normalize input
            d = cv2.normalize(depth.astype(np.float32), None, 0, 1, cv2.NORM_MINMAX)
            # Edge mask from guide
            edges = cv2.Canny(guide, 50, 150)
            edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
            edges_f = (edges > 0).astype(np.float32)
            # Bilateral smoothing for non-edge regions
            smooth = cv2.bilateralFilter(d, d=9, sigmaColor=0.1, sigmaSpace=7)
            refined = smooth * (1.0 - 0.6 * edges_f) + d * (0.4 + 0.6 * edges_f)
            return cv2.normalize(refined, None, 0, 1, cv2.NORM_MINMAX)
        except Exception:
            return depth
    
    def create_3d_mesh_from_depth(self, height_scale=10, resolution_factor=1.0, invert_depth=False):
        """
        Create 3D mesh from depth map.
        
        Args:
            height_scale: multiplier for height values
            resolution_factor: factor to reduce resolution (0.1-1.0)
            invert_depth: invert depth values (closer objects higher)
        """
        if self.depth_map is None:
            raise ValueError("No depth map available. Call estimate_depth() first.")
        
        # Resize depth map if needed
        if resolution_factor < 1.0:
            new_size = (int(self.depth_map.shape[1] * resolution_factor), 
                       int(self.depth_map.shape[0] * resolution_factor))
            depth_resized = cv2.resize(self.depth_map, new_size)
        else:
            depth_resized = self.depth_map
        
        h, w = depth_resized.shape
        
        # Invert depth if requested
        if invert_depth:
            depth_resized = 1.0 - depth_resized
        
        # Create coordinate grids
        x = np.linspace(0, w-1, w)
        y = np.linspace(0, h-1, h)
        X, Y = np.meshgrid(x, y)
        Z = depth_resized * height_scale
        
        return X, Y, Z
    
    def create_trimesh_from_depth(self, height_scale=10, resolution_factor=1.0, invert_depth=False):
        """Create a trimesh object from the depth map."""
        X, Y, Z = self.create_3d_mesh_from_depth(height_scale, resolution_factor, invert_depth)
        
        # Create vertices
        vertices = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
        
        # Create faces (triangles)
        h, w = X.shape
        faces = []
        
        for i in range(h-1):
            for j in range(w-1):
                # Current square indices
                top_left = i * w + j
                top_right = i * w + (j + 1)
                bottom_left = (i + 1) * w + j
                bottom_right = (i + 1) * w + (j + 1)
                
                # Create two triangles for each square
                faces.append([top_left, bottom_left, top_right])
                faces.append([top_right, bottom_left, bottom_right])
        
        # Create trimesh object
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
        
        # Add texture coordinates if original image is available
        if self.original_image is not None:
            # Resize original image to match mesh resolution
            img_resized = self.original_image.resize((w, h))
            img_array = np.array(img_resized)
            
            # Normalize texture coordinates
            u = X / (w - 1)
            v = 1.0 - Y / (h - 1)  # Flip V coordinate
            uv = np.column_stack([u.ravel(), v.ravel()])
            mesh.visual.uv = uv
        
        return mesh
    
    def export_depth_mesh(self, output_path, format='obj', height_scale=10, 
                         resolution_factor=1.0, invert_depth=False):
        """Export 3D mesh from depth map to file."""
        mesh = self.create_trimesh_from_depth(height_scale, resolution_factor, invert_depth)
        
        if format.lower() == 'obj':
            mesh.export(output_path)
        elif format.lower() == 'stl':
            mesh.export(output_path)
        elif format.lower() == 'ply':
            mesh.export(output_path)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        print(f"Depth-based mesh exported to {output_path}")
    
    def visualize_depth_map(self):
        """Visualize the depth map."""
        if self.depth_map is None:
            raise ValueError("No depth map available. Call estimate_depth() first.")
        
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))
        
        # Original image
        if self.original_image is not None:
            axes[0].imshow(self.original_image)
            axes[0].set_title("Original Image")
            axes[0].axis('off')
        
        # Depth map
        im = axes[1].imshow(self.depth_map, cmap='viridis')
        axes[1].set_title("Depth Map")
        axes[1].axis('off')
        plt.colorbar(im, ax=axes[1], shrink=0.8)
        
        plt.tight_layout()
        plt.show()
    
    def visualize_3d_depth(self, height_scale=10, resolution_factor=0.5, invert_depth=False):
        """Visualize the 3D depth map using matplotlib."""
        X, Y, Z = self.create_3d_mesh_from_depth(height_scale, resolution_factor, invert_depth)
        
        fig = plt.figure(figsize=(12, 8))
        ax = fig.add_subplot(111, projection='3d')
        
        surf = ax.plot_surface(X, Y, Z, cmap='viridis', alpha=0.8, 
                             linewidth=0, antialiased=True)
        fig.colorbar(surf, shrink=0.5, aspect=5)
        
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_zlabel('Depth')
        ax.set_title('3D Depth Visualization')
        
        plt.tight_layout()
        plt.show()
    
    def visualize_with_pyvista_depth(self, height_scale=10, resolution_factor=0.5, invert_depth=False):
        """Visualize using PyVista for interactive 3D viewing."""
        X, Y, Z = self.create_3d_mesh_from_depth(height_scale, resolution_factor, invert_depth)
        
        # Create PyVista mesh
        grid = pv.StructuredGrid(X, Y, Z)
        
        # Add texture if original image is available
        if self.original_image is not None:
            # Resize original image to match grid
            img_resized = self.original_image.resize((X.shape[1], X.shape[0]))
            img_array = np.array(img_resized)
            grid.texture_map_to_plane(inplace=True)
        
        # Create plotter
        plotter = pv.Plotter()
        plotter.add_mesh(grid, show_edges=False, cmap='viridis')
        plotter.add_axes()
        plotter.show()
    
    def get_depth_stats(self):
        """Get statistics about the depth map."""
        if self.depth_map is None:
            return None
        
        return {
            'shape': self.depth_map.shape,
            'min_depth': np.min(self.depth_map),
            'max_depth': np.max(self.depth_map),
            'mean_depth': np.mean(self.depth_map),
            'std_depth': np.std(self.depth_map)
        }


def demo_depth_estimation():
    """Demonstration of depth estimation."""
    estimator = DepthEstimator()
    
    # For demo purposes, create a sample image
    print("Creating sample image for depth estimation...")
    
    # Create a sample image with depth-like patterns
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    
    # Add circles at different "depths"
    cv2.circle(img, (100, 100), 80, (255, 255, 255), -1)  # Background
    cv2.circle(img, (100, 100), 60, (200, 200, 200), -1)  # Mid
    cv2.circle(img, (100, 100), 40, (150, 150, 150), -1)  # Foreground
    cv2.circle(img, (100, 100), 20, (100, 100, 100), -1)  # Closest
    
    # Save sample image
    cv2.imwrite('sample_depth.png', img)
    
    # Load and process
    if estimator.load_image('sample_depth.png'):
        estimator.estimate_depth()
        
        # Show statistics
        stats = estimator.get_depth_stats()
        print(f"Depth map stats: {stats}")
        
        # Visualize depth map
        estimator.visualize_depth_map()
        
        # Create and export mesh
        estimator.export_depth_mesh('output_depth_mesh.obj', height_scale=20)
        
        # Visualize 3D
        estimator.visualize_3d_depth(height_scale=20, resolution_factor=0.3)
        
        print("Demo completed! Check 'output_depth_mesh.obj' for the exported mesh.")


if __name__ == "__main__":
    demo_depth_estimation()
