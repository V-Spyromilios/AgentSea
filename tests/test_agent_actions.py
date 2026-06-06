def _draft_payload() -> dict[str, object]:
    return {
        "company_name": "Hamburg Cargo",
        "warehouse_name": "Hamburg North Warehouse",
        "vessel_name": "Hamburg Trader",
        "imo": "9321483",
        "supplier_promised_eta": "2026-06-09",
        "realistic_eta": "2026-06-12",
        "delay_days": 3,
        "risk_level": "high",
        "recommendation": "Notify warehouse and prepare a fallback receiving slot.",
    }


def test_warehouse_email_draft_requires_approval(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/agent-actions/warehouse-email-draft",
        json=_draft_payload(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "requires_approval"
    assert body["action_type"] == "warehouse_email_draft"
    assert body["approval_required"] is True
    assert body["send_status"] == "not_sent"


def test_warehouse_email_draft_includes_eta_context(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/agent-actions/warehouse-email-draft",
        json=_draft_payload(),
    )

    body = response.json()
    assert "Hamburg Trader" in body["subject"]
    assert "2026-06-09" in body["body"]
    assert "2026-06-12" in body["body"]
    assert "3 days" in body["body"]
    assert "Risk level: high" in body["body"]


def test_warehouse_email_draft_never_claims_email_sent(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/agent-actions/warehouse-email-draft",
        json=_draft_payload(),
    )

    body = response.json()
    assert body["send_status"] == "not_sent"
    assert "requires human approval" in body["body"]
    assert "email sent" not in body["body"].lower()


def test_approval_marks_draft_approved_but_not_sent(app_client_factory) -> None:
    client = app_client_factory()
    draft = client.post(
        "/v1/agent-actions/warehouse-email-draft",
        json=_draft_payload(),
    ).json()

    response = client.post(
        f"/v1/agent-actions/{draft['action_id']}/approve",
        json={"approved_by": "Hamburg Cargo operator"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "approved"
    assert body["send_status"] == "not_sent"
    assert "No email was sent by MarineAgent" in body["approval_note"]


def test_approval_unknown_action_returns_not_found(app_client_factory) -> None:
    client = app_client_factory()

    response = client.post(
        "/v1/agent-actions/does-not-exist/approve",
        json={"approved_by": "Hamburg Cargo operator"},
    )

    assert response.status_code == 404
