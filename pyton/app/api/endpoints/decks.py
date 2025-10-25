# Archivo: app/api/endpoints/decks.py
from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from typing import Optional, List

# Importamos los modelos y servicios
from app.models.flashcard import UpdateStatusRequest, ResetRequest
from app.services import deck_service

router = APIRouter()

@router.get("/available-flashcards-files")
async def get_available_flashcards_files():
    """Retorna la lista de todos los archivos JSON de decks disponibles."""
    try:
        file_list = await run_in_threadpool(deck_service.list_decks)
        # Nota: El concepto de "active_file" ya no existe en el backend,
        # el frontend es ahora responsable de saber qué deck está activo.
        return JSONResponse({"success": True, "files": file_list})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudieron listar los archivos: {e}")

@router.get("/flashcards-data")
async def get_flashcards_data(deck: str = Query(...)):
    """Retorna los datos del deck especificado."""
    try:
        data = await run_in_threadpool(deck_service.get_deck_data, deck)
        return JSONResponse(data)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Archivo de deck no encontrado: {deck}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudieron cargar los datos: {e}")

@router.post('/update-status')
async def update_card_status(request_data: UpdateStatusRequest):
    """Actualiza el estado de la tarjeta para el deck especificado."""
    try:
        await run_in_threadpool(
            deck_service.update_card_status,
            request_data.deck, 
            request_data.index, 
            request_data.learned
        )
        return JSONResponse({"success": True, "message": f"Tarjeta {request_data.index} actualizada."})
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Deck no encontrado: {request_data.deck}")
    except IndexError:
        raise HTTPException(status_code=404, detail="Índice fuera de rango.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar el estado: {e}")

@router.post("/reset-all")
async def reset_all_statuses(request_data: ResetRequest):
    """Resetea el estado de todas las tarjetas para el deck especificado."""
    try:
        await run_in_threadpool(deck_service.reset_deck_status, request_data.deck)
        return JSONResponse({"success": True, "message": f"Todas las tarjetas en '{request_data.deck}' reseteadas."})
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Deck no encontrado para reset: {request_data.deck}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al resetear: {e}")