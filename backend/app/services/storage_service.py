import os
from abc import ABC, abstractmethod
from typing import Optional

class BaseStorageProvider(ABC):
    """
    Abstract interface for food image storage.
    Enables swapping in AWS S3, Cloudinary, Firebase Storage, or Azure Blob Storage.
    """
    @abstractmethod
    def store_image(self, file_bytes: bytes, filename: str) -> str:
        """Stores image and returns the public HTTP URL."""
        pass

    @abstractmethod
    def get_default_image_for_category(self, category: str) -> str:
        """Returns a high quality default food photo matching category."""
        pass

class MockStorageProvider(BaseStorageProvider):
    """
    Provides curated high-resolution Unsplash food photography for each category,
    or returns direct URLs for testing.
    """
    CATEGORY_DEFAULTS = {
        "prepared_meal": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80",
        "produce": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80",
        "bakery": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
        "canned": "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=600&auto=format&fit=crop&q=80",
        "packaged": "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=600&auto=format&fit=crop&q=80",
        "raw_ingredient": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
    }

    def store_image(self, file_bytes: bytes, filename: str) -> str:
        # In mock mode, generate a placeholder asset URL
        return f"/uploads/{filename}"

    def get_default_image_for_category(self, category: str) -> str:
        return self.CATEGORY_DEFAULTS.get(
            category,
            "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80"
        )

# Active provider
storage_provider: BaseStorageProvider = MockStorageProvider()
