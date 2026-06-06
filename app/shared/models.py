from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class CongestionLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class VerificationStatus(StrEnum):
    VERIFIED = "verified"
    QUESTIONABLE = "questionable"
    INCONSISTENT = "inconsistent"


class NavigationStatus(StrEnum):
    UNDERWAY = "underway"
    BERTHED = "berthed"
    ANCHORED = "anchored"


class VesselRecord(BaseModel):
    model_config = ConfigDict(frozen=True)

    imo: str
    vessel_name: str
    navigation_status: NavigationStatus
    current_port_code: str
    current_port_name: str
    destination_port_code: str
    destination_port_name: str
    realistic_eta: date
    last_ais_timestamp: datetime
    speed_knots: float = Field(ge=0)
    status_summary: str
    supplier_claim_departed_at: date | None = None
    supplier_claim_departure_port_code: str | None = None
    actual_departed_at: date | None = None
    actual_departure_port_code: str | None = None
    departure_signal_strength: float = Field(ge=0, le=1)


class PortRecord(BaseModel):
    model_config = ConfigDict(frozen=True)

    code: str
    name: str
    waiting_vessels: int = Field(ge=0)
    average_delay_hours: float = Field(ge=0)
    berth_utilization: float = Field(ge=0, le=1)
