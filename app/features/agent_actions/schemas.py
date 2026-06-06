from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class AgentActionEvidence(BaseModel):
    source: str
    summary: str


class WarehouseEmailDraftRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
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
        }
    )

    company_name: str
    warehouse_name: str
    vessel_name: str
    imo: str
    supplier_promised_eta: str
    realistic_eta: str
    delay_days: int
    risk_level: Literal["low", "medium", "high"]
    recommendation: str


class WarehouseEmailDraftResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "action_id": "e8a5669d3fb94d0e8576b8f3d9321ec1",
                "action_type": "warehouse_email_draft",
                "status": "requires_approval",
                "recipient_role": "warehouse",
                "recipient_name": "Hamburg North Warehouse",
                "subject": "Possible arrival delay for Hamburg Trader",
                "body": (
                    "Hello Hamburg North Warehouse team,\n\n"
                    "MarineAgent has flagged a likely delay for Hamburg Trader.\n\n"
                    "Supplier promised ETA: 2026-06-09\n"
                    "Realistic ETA: 2026-06-12\n"
                    "Expected delay: 3 days\n"
                    "Risk level: high\n\n"
                    "Please prepare a fallback receiving slot around 2026-06-12 and avoid locking "
                    "the June 9 slot until the ETA is reconfirmed.\n\n"
                    "This draft requires human approval before sending.\n\n"
                    "Best,\nHamburg Cargo Operations Agent"
                ),
                "approval_required": True,
                "send_status": "not_sent",
                "evidence": [
                    {
                        "source": "eta-risk-intelligence",
                        "summary": "Realistic ETA is 2026-06-12, 3 days after supplier promised ETA.",
                    }
                ],
            }
        }
    )

    action_id: str
    action_type: Literal["warehouse_email_draft"] = "warehouse_email_draft"
    status: Literal["requires_approval"]
    recipient_role: Literal["warehouse"] = "warehouse"
    recipient_name: str
    subject: str
    body: str
    approval_required: bool = True
    send_status: Literal["not_sent"] = "not_sent"
    evidence: list[AgentActionEvidence]


class AgentActionApprovalRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"approved_by": "Hamburg Cargo operator"}}
    )

    approved_by: str


class AgentActionApprovalResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "action_id": "e8a5669d3fb94d0e8576b8f3d9321ec1",
                "status": "approved",
                "send_status": "not_sent",
                "approval_note": "Draft approved for manual sending. No email was sent by MarineAgent.",
                "approved_by": "Hamburg Cargo operator",
            }
        }
    )

    action_id: str
    status: Literal["approved"]
    send_status: Literal["not_sent"] = "not_sent"
    approval_note: str
    approved_by: str
