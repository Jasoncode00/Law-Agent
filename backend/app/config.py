from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    # Server config
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # LLM config
    LLM_PROVIDER: Literal["claude", "openai"] = "claude"
    LLM_MODEL: str = "claude-3-5-sonnet-20241022"
    
    # API Keys
    ANTHROPIC_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    
    # Azure OpenAI config
    AZURE_OPENAI_ENDPOINT: str | None = None
    AZURE_OPENAI_DEPLOYMENT_NAME: str | None = None
    AZURE_OPENAI_API_VERSION: str = "2024-05-01-preview"

    # MCP config
    MCP_SERVER_COMMAND: str = "korean-law-mcp"
    LAW_OC: str = "jason00"

    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
