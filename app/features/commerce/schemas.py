from pydantic import BaseModel, ConfigDict


class ProductPrice(BaseModel):
    asset: str
    amount: str
    network: str


class FuturePaymentRequirement(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product": "eta-risk",
                "payment_required": False,
                "future_protocol": "x402",
                "network": "algorand-testnet",
            }
        }
    )

    product: str
    payment_required: bool = False
    future_protocol: str = "x402"
    network: str
