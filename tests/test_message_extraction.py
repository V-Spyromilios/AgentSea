def test_extracts_iso_date_from_message(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/message-extraction/supplier-claim",
        json={
            "imo_hint": "9321483",
            "route_hint": "Asia → Hamburg",
            "message": (
                "Hamburg Trader is still expected to arrive in Hamburg by 2026-06-13.\n"
                "IMO: 9321483\n"
                "Route: Asia to Hamburg"
            ),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["supplier_promised_eta"] == "2026-06-13"


def test_extracts_imo_or_preserves_hint(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/message-extraction/supplier-claim",
        json={
            "imo_hint": "9321483",
            "route_hint": "Asia → Hamburg",
            "message": "Expected arrival by 2026-06-09. Route: Asia to Hamburg",
        },
    )

    assert response.status_code == 200
    assert response.json()["vessel_imo"] == "9321483"


def test_uses_route_hint_when_needed(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/message-extraction/supplier-claim",
        json={
            "imo_hint": "9321483",
            "route_hint": "Asia → Hamburg",
            "message": "Arrival expected by 2026-06-09. IMO: 9321483",
        },
    )

    assert response.status_code == 200
    assert response.json()["route_context"] == "Asia → Hamburg"


def test_returns_claim_summary(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/message-extraction/supplier-claim",
        json={
            "imo_hint": "9321483",
            "route_hint": "Asia → Hamburg",
            "message": "Arrival expected by 2026-06-09. IMO: 9321483",
        },
    )

    assert response.status_code == 200
    assert (
        response.json()["claim_summary"]
        == "Supplier claims the vessel will arrive by 2026-06-09."
    )


def test_missing_date_is_deterministic(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/message-extraction/supplier-claim",
        json={
            "imo_hint": "9321483",
            "route_hint": "Asia → Hamburg",
            "message": "Please keep the slot ready. IMO: 9321483",
        },
    )

    assert response.status_code == 422
    assert "supplier-promised ETA" in response.json()["detail"]
