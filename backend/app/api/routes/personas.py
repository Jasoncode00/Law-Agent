from fastapi import APIRouter
from typing import List
from ...models.schemas import PersonaResponse
from ...core.personas import PERSONAS

router = APIRouter()

@router.get("/", response_model=List[PersonaResponse])
async def list_personas():
    return [
        PersonaResponse(
            id=p["id"],
            name=p["name"],
            description=p["description"]
        ) for p in PERSONAS.values()
    ]
