from abc import ABC, abstractmethod

from app.core.errors import ResourceNotFoundError
from app.data.mock_vessels import MOCK_VESSELS
from app.shared.models import VesselRecord


class AISProvider(ABC):
    @abstractmethod
    def get_vessel(self, imo: str) -> VesselRecord:
        raise NotImplementedError


class MockAISProvider(AISProvider):
    def get_vessel(self, imo: str) -> VesselRecord:
        vessel = MOCK_VESSELS.get(imo)
        if vessel is None:
            raise ResourceNotFoundError(f"Vessel with IMO '{imo}' was not found.")
        return vessel
