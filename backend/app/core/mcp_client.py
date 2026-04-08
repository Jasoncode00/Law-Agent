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
    """

    def __init__(self):
        self.command_parts = shlex.split(settings.MCP_SERVER_COMMAND)
        # Pass LAW_OC env var to MCP server (required for korean-law-mcp)
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
        """Establish connection to the MCP server"""
        from contextlib import AsyncExitStack
        self._exit_stack = AsyncExitStack()
        
        logger.info(f"Connecting to MCP server: {settings.MCP_SERVER_COMMAND}")
        read, write = await self._exit_stack.enter_async_context(stdio_client(self.server_params))
        self._session = await self._exit_stack.enter_async_context(ClientSession(read, write))
        
        await self._session.initialize()
        logger.info("MCP server initialized successfully")

    async def disconnect(self):
        """Close the MCP server connection"""
        if self._exit_stack:
            await self._exit_stack.aclose()
            self._session = None
            logger.info("MCP server connection closed")

    async def get_tools(self) -> List[Any]:
        """Fetch list of available tools from the MCP server"""
        if not self._session:
            await self.connect()
        
        response = await self._session.list_tools()
        return response.tools

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Call a specific tool on the MCP server (동시 호출 직렬화)"""
        if not self._session:
            await self.connect()

        async with self._lock:
            logger.info(f"Calling MCP tool: {name} with args: {arguments}")
            result = await self._session.call_tool(name, arguments)
        return result
