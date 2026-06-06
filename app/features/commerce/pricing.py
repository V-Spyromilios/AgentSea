from app.core.config import settings
from app.features.commerce.schemas import ProductPrice


PRODUCT_PRICING: dict[str, ProductPrice] = {
    "vessel-status": ProductPrice(
        asset=settings.default_price_asset,
        amount="0.01",
        network=settings.default_price_network,
    ),
    "eta-risk": ProductPrice(
        asset=settings.default_price_asset,
        amount="0.02",
        network=settings.default_price_network,
    ),
    "port-congestion": ProductPrice(
        asset=settings.default_price_asset,
        amount="0.02",
        network=settings.default_price_network,
    ),
    "departure-verification": ProductPrice(
        asset=settings.default_price_asset,
        amount="0.02",
        network=settings.default_price_network,
    ),
}
