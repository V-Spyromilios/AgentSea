from app.shared.models import PortRecord


MOCK_PORTS: dict[str, PortRecord] = {
    "DEHAM": PortRecord(
        code="DEHAM",
        name="Hamburg",
        waiting_vessels=14,
        average_delay_hours=28.0,
        berth_utilization=0.91,
    ),
    "NLRTM": PortRecord(
        code="NLRTM",
        name="Rotterdam",
        waiting_vessels=7,
        average_delay_hours=12.0,
        berth_utilization=0.74,
    ),
    "SGSIN": PortRecord(
        code="SGSIN",
        name="Singapore",
        waiting_vessels=3,
        average_delay_hours=4.0,
        berth_utilization=0.58,
    ),
}
