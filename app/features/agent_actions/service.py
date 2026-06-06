from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from app.features.agent_actions.schemas import (
    AgentActionApprovalResponse,
    AgentActionEvidence,
    AgentActionApprovalRequest,
    WarehouseEmailDraftRequest,
    WarehouseEmailDraftResponse,
)


@dataclass
class DraftRecord:
    draft: WarehouseEmailDraftResponse


_DRAFTS: dict[str, DraftRecord] = {}


class AgentActionService:
    def create_warehouse_email_draft(
        self, request: WarehouseEmailDraftRequest
    ) -> WarehouseEmailDraftResponse:
        action_id = uuid4().hex
        subject = f"Possible arrival delay for {request.vessel_name}"
        body = "\n".join(
            [
                f"Hello {request.warehouse_name} team,",
                "",
                f"MarineAgent has flagged a likely delay for {request.vessel_name}.",
                "",
                f"Supplier promised ETA: {request.supplier_promised_eta}",
                f"Realistic ETA: {request.realistic_eta}",
                f"Expected delay: {request.delay_days} days",
                f"Risk level: {request.risk_level}",
                "",
                self._recommendation_line(request),
                "",
                "This draft requires human approval before sending.",
                "",
                "Best,",
                f"{request.company_name} Operations Agent",
            ]
        )
        response = WarehouseEmailDraftResponse(
            action_id=action_id,
            status="requires_approval",
            recipient_name=request.warehouse_name,
            subject=subject,
            body=body,
            evidence=[
                AgentActionEvidence(
                    source="eta-risk-intelligence",
                    summary=(
                        f"Realistic ETA is {request.realistic_eta}, {request.delay_days} days "
                        f"after supplier promised ETA."
                    ),
                )
            ],
        )
        _DRAFTS[action_id] = DraftRecord(draft=response)
        return response

    def approve_draft(
        self, action_id: str, request: AgentActionApprovalRequest
    ) -> AgentActionApprovalResponse:
        if action_id not in _DRAFTS:
            raise KeyError(action_id)

        return AgentActionApprovalResponse(
            action_id=action_id,
            status="approved",
            approval_note=(
                "Draft approved for manual sending. No email was sent by MarineAgent."
            ),
            approved_by=request.approved_by,
        )

    @staticmethod
    def _recommendation_line(request: WarehouseEmailDraftRequest) -> str:
        recommendation = request.recommendation.strip()

        if recommendation:
            normalized = recommendation[0].lower() + recommendation[1:]
            return (
                f"Please {normalized.rstrip('.')} around "
                f"{request.realistic_eta} and avoid locking the {request.supplier_promised_eta} "
                "slot until the ETA is reconfirmed."
            )
        return (
            f"Please prepare a fallback receiving slot around {request.realistic_eta} and "
            f"avoid locking the {request.supplier_promised_eta} slot until the ETA is reconfirmed."
        )


_SERVICE = AgentActionService()


def get_agent_action_service() -> AgentActionService:
    return _SERVICE
