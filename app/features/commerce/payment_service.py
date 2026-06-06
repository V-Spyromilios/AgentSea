from app.features.commerce.pricing import PRODUCT_PRICING
from app.features.commerce.schemas import FuturePaymentRequirement, ProductPrice
from app.features.commerce.x402_config import get_x402_settings


def get_product_price(product: str) -> ProductPrice:
    if product == "eta-risk":
        x402_settings = get_x402_settings()
        if x402_settings.enabled:
            return x402_settings.eta_risk_price
    return PRODUCT_PRICING[product]


def get_future_payment_requirement(product: str) -> FuturePaymentRequirement:
    price = get_product_price(product)
    return FuturePaymentRequirement(product=product, network=price.network)
