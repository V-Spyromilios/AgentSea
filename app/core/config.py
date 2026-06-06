from pydantic import BaseModel, ConfigDict


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    app_name: str = "AgentSea"
    version: str = "0.1.0"
    project_description: str = (
        "Agent-first maritime intelligence API for structured operational decisions."
    )
    agent_first: bool = True
    x402_ready: bool = True
    algorand_ready: bool = True
    default_price_asset: str = "EURQ"
    default_price_network: str = "algorand-testnet"


settings = Settings()
