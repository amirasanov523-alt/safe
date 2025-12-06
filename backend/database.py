from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.settings import settings

# 1. Create Async Engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True, # Set to False in production
)

# 2. Session Factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# 3. Base class for ORM models
Base = declarative_base()

# 4. Dependency Injection for FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
