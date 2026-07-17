import httpx
import asyncio

async def test_api():
    async with httpx.AsyncClient() as client:
        # Assuming we need to login first
        # But wait, we don't have the password for admin@nippon.test
        pass

if __name__ == "__main__":
    asyncio.run(test_api())
