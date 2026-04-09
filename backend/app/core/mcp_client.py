from typing import List, Dict, Any, Optional
import asyncio
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import shlex
from ..config import settings
from ..utils.logger import logger

class MCPClient:
    """Client for connecting to the korean-law MCP server.

    앱 전체에서 단일 인스턴스를 공유한다 (main.py lifespan).
    stdio 스트림은 동시 호출이 안전하지 않으므로 _lock으로 직렬화한다.
    연결 장애 시 1회 자동 재연결을 시도한다.
    """

    def __init__(self):
        self.command_parts = shlex.split(settings.MCP_SERVER_COMMAND)
        env = {**os.environ, "LAW_OC": settings.LAW_OC}
        self.server_params = StdioServerParameters(
            command=self.command_parts[0],
            args=self.command_parts[1:],
            env=env
        )
        self._session: Optional[ClientSession] = None
        self._exit_stack = None
        self._lock = asyncio.Lock()

    async def connect(self):
        """MCP 서버에 연결한다. 기존 연결이 있으면 먼저 정리한다."""
        # 기존 연결 정리
        if self._exit_stack:
            try:
                await self._exit_stack.aclose()
            except Exception:
                pass
            self._exit_stack = None
            self._session = None

        from contextlib import AsyncExitStack
        self._exit_stack = AsyncExitStack()

        logger.info(f"Connecting to MCP server: {settings.MCP_SERVER_COMMAND}")
        read, write = await self._exit_stack.enter_async_context(stdio_client(self.server_params))
        self._session = await self._exit_stack.enter_async_context(ClientSession(read, write))

        await self._session.initialize()
        logger.info("MCP server initialized successfully")

    async def disconnect(self):
        """MCP 서버 연결을 종료한다."""
        if self._exit_stack:
            await self._exit_stack.aclose()
            self._session = None
            logger.info("MCP server connection closed")

    async def get_tools(self) -> List[Any]:
        """사용 가능한 도구 목록을 반환한다."""
        if not self._session:
            await self.connect()

        response = await self._session.list_tools()
        return response.tools

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        """도구를 호출한다. 연결 장애 시 1회 자동 재연결 후 재시도한다."""
        if not self._session:
            await self.connect()

        async with self._lock:
            try:
                logger.info(f"Calling MCP tool: {name} with args: {arguments}")
                result = await self._session.call_tool(name, arguments)
                return result
            except Exception as e:
                # 연결 장애로 판단 — 세션 초기화 후 1회 재연결 시도
                logger.warning(f"MCP tool call failed ({name}): {e} — attempting reconnect")
                self._session = None
                try:
                    await self.connect()
                    logger.info(f"Reconnected. Retrying MCP tool: {name}")
                    result = await self._session.call_tool(name, arguments)
                    return result
                except Exception as retry_err:
                    logger.error(f"MCP tool retry failed ({name}): {retry_err}")
                    raise
