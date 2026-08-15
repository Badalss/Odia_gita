import asyncio
import websockets
import json

connected = set()

async def handler(websocket):
    connected.add(websocket)
    try:
        count = len(connected)
        message = json.dumps({'type': 'count', 'count': count})
        await asyncio.gather(*[ws.send(message) for ws in connected])
        async for msg in websocket:
            pass
    finally:
        connected.discard(websocket)
        if connected:
            count = len(connected)
            message = json.dumps({'type': 'count', 'count': count})
            await asyncio.gather(*[ws.send(message) for ws in connected], return_exceptions=True)

async def main():
    server = await websockets.serve(handler, '0.0.0.0', 8765)
    await server.wait_closed()

asyncio.run(main())
