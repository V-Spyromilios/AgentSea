from app.features.commerce.pricing import get_product_pricing
from app.features.commerce.schemas import FuturePaymentRequirement, ProductPrice
from app.features.commerce.x402_config import get_x402_settings


def get_product_price(product: str) -> ProductPrice:
    x402_settings = get_x402_settings()
    if x402_settings.enabled:
        if product == "eta-risk":
            return x402_settings.eta_risk_price
        if product == "port-congestion":
            return x402_settings.port_congestion_price
    return get_product_pricing()[product]


def get_future_payment_requirement(product: str) -> FuturePaymentRequirement:
    price = get_product_price(product)
    return FuturePaymentRequirement(product=product, network=price.network)
