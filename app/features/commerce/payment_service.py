from app.features.commerce.pricing import PRODUCT_PRICING
from app.features.commerce.schemas import FuturePaymentRequirement, ProductPrice


def get_product_price(product: str) -> ProductPrice:
    return PRODUCT_PRICING[product]


def get_future_payment_requirement(product: str) -> FuturePaymentRequirement:
    price = get_product_price(product)
    return FuturePaymentRequirement(product=product, network=price.network)
