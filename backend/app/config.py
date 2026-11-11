from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "KidQuest Academy"
    mongo_url: str = "mongodb://localhost:27017"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    # Phase 2 multiplayer: short-lived game-session tokens + the shared
    # secret the Colyseus game server uses when calling internal endpoints.
    game_token_expire_minutes: int = 15
    multiplayer_internal_secret: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()
