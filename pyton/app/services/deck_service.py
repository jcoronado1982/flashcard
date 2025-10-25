# Archivo: app/services/deck_service.py
import json
import logging
from typing import List, Dict, Any
from pathlib import Path

# Importamos la configuración central
from app.core.config import settings

def _get_deck_path(deck_name: str) -> Path:
    """Retorna la ruta completa al archivo JSON de un deck específico."""
    filename = deck_name if deck_name.endswith(".json") else f"{deck_name}.json"
    path = settings.JSON_DIR_PATH / filename
    if not path.exists():
        raise FileNotFoundError(f"El archivo del deck '{filename}' no existe.")
    return path

def list_decks() -> List[str]:
    """Lista todos los archivos JSON de decks disponibles."""
    if not settings.JSON_DIR_PATH.exists():
        return []
    return [p.name for p in settings.JSON_DIR_PATH.glob("*.json")]

def get_deck_data(deck_name: str) -> List[Dict[str, Any]]:
    """Lee y retorna todos los datos de un deck específico."""
    current_path = _get_deck_path(deck_name)
    with open(current_path, "r", encoding="utf-8") as f:
        return json.load(f)

def update_card_status(deck_name: str, index: int, learned: bool):
    """Actualiza el estado 'learned' de una tarjeta por índice en un deck."""
    current_path = _get_deck_path(deck_name)
    
    # Leer datos
    with open(current_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    if 0 <= index < len(data):
        data[index]['learned'] = learned
    else:
        raise IndexError("Índice fuera de rango.")
    
    # Escribir datos
    with open(current_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def reset_deck_status(deck_name: str):
    """Marca todas las tarjetas como 'not learned' para un deck."""
    current_path = _get_deck_path(deck_name)
    
    # Leer datos
    with open(current_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for card in data:
        card['learned'] = False
        if 'imagePath' in card:
            card['imagePath'] = None 
            
    # Escribir datos
    with open(current_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)