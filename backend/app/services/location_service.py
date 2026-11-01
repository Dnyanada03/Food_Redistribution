import math
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseLocationProvider(ABC):
    """
    Abstract interface for mapping and geolocation services.
    Enables swapping in Google Maps, Mapbox, OpenStreetMap, or HERE API in production.
    """
    @abstractmethod
    def calculate_distance(self, pincode1: str, pincode2: str) -> float:
        """Returns estimated distance in kilometers between two postal codes."""
        pass

    @abstractmethod
    def get_coordinates(self, address: str, pincode: str) -> Dict[str, float]:
        """Returns {'lat': float, 'lng': float} for a given address and postal code."""
        pass

    @abstractmethod
    def get_map_view_url(self, address: str, pincode: str) -> str:
        """Returns a static map or web preview URL."""
        pass

class MockLocationProvider(BaseLocationProvider):
    """
    Deterministically computes distances and coordinates based on pincode differences.
    Clean mock for local testing without external API keys or rate limits.
    """
    def calculate_distance(self, pincode1: str, pincode2: str) -> float:
        try:
            p1 = int("".join(c for c in pincode1 if c.isdigit()))
            p2 = int("".join(c for c in pincode2 if c.isdigit()))
            # Heuristic calculation for demo: ~1.2 km per difference unit, clamped between 1.5 and 28 km
            diff = abs(p1 - p2)
            dist = round(1.5 + (diff % 25) * 1.1, 1)
            return dist
        except Exception:
            return 3.2 # Fallback distance in km

    def get_coordinates(self, address: str, pincode: str) -> Dict[str, float]:
        base_lat = 40.7128 # Default NYC coordinates
        base_lng = -74.0060
        try:
            offset = (int("".join(c for c in pincode if c.isdigit())) % 100) * 0.005
            return {"lat": round(base_lat + offset, 4), "lng": round(base_lng - offset, 4)}
        except Exception:
            return {"lat": base_lat, "lng": base_lng}

    def get_map_view_url(self, address: str, pincode: str) -> str:
        coords = self.get_coordinates(address, pincode)
        return f"https://www.openstreetmap.org/export/embed.html?bbox={coords['lng']-0.01}%2C{coords['lat']-0.01}%2C{coords['lng']+0.01}%2C{coords['lat']+0.01}&layer=mapnik&marker={coords['lat']}%2C{coords['lng']}"

# Active provider
location_provider: BaseLocationProvider = MockLocationProvider()
