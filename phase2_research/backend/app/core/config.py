from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "ChessExplain"
    API_V1_STR: str = "/api/v1"
    
    # Engine Settings
    STOCKFISH_PATH: str = "stockfish"
    ENGINE_TIME_LIMIT: float = 0.5  # 引擎思考时间（秒）
    ENGINE_DEPTH: int = 15          # 引擎思考深度
    
    # LLM Settings
    DEEPSEEK_API_KEY: str = ""
    LLM_MODEL: str = "deepseek-reasoner"
    
    # Server/DB Settings
    DATABASE_URL: Optional[str] = None
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
