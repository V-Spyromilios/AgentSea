from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.features.agent_actions.schemas import (
    AgentActionApprovalRequest,
    AgentActionApprovalResponse,
    WarehouseEmailDraftRequest,
    WarehouseEmailDraftResponse,
)
from app.features.agent_actions.service import get_agent_action_service


router = APIRouter(prefix="/v1/agent-actions", tags=["agent-actions"])


@router.post(
    "/warehouse-email-draft",
    summary="Draft a warehouse notification email",
    description=(
        "Create a professional warehouse notification draft from ETA risk intelligence. "
        "The output is always a draft, requires human approval, and does not send email."
    ),
    response_model=WarehouseEmailDraftResponse,
)
def create_warehouse_email_draft(
    request: WarehouseEmailDraftRequest,
) -> WarehouseEmailDraftResponse:
    service = get_agent_action_service()
    return service.create_warehouse_email_draft(request)


@router.post(
    "/{action_id}/approve",
    summary="Approve an operational draft",
    description=(
        "Mark a demo action draft as human-approved for manual sending. "
        "MarineAgent does not send any email in this flow."
    ),
    response_model=AgentActionApprovalResponse,
)
def approve_agent_action(
    action_id: str, request: AgentActionApprovalRequest
) -> AgentActionApprovalResponse:
    service = get_agent_action_service()
    try:
        return service.approve_draft(action_id, request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Agent action draft not found.") from exc
