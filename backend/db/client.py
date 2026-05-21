import motor.motor_asyncio
from settings import settings

_client: motor.motor_asyncio.AsyncIOMotorClient | None = None


def get_db():
    if _client is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _client[settings.db_name]


async def connect_db() -> None:
    global _client
    _client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
