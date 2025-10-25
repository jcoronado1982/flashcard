# Archivo: app/services/image_service.py
import os
import logging
from typing import Optional
from requests.exceptions import Timeout, ConnectionError

# Importamos clientes y configuración central
from app.core.config import settings, ia_model

def _get_image_dir_for_deck(deck_name: str) -> Path:
    """Retorna la ruta al directorio de imágenes para un deck y asegura que exista."""
    folder_name = deck_name.replace(".json", "")
    deck_image_dir = settings.BASE_DIR / settings.CARD_IMAGES_BASE_DIR / folder_name
    os.makedirs(deck_image_dir, exist_ok=True)
    return deck_image_dir

def _get_deck_prefix(deck_name: str) -> str:
    """Extrae el nombre base del deck/verbo."""
    return deck_name.replace(".json", "")

def get_image_filepath(deck_name: str, card_index: int, def_index: int) -> Path:
    """Construye la ruta completa donde debería estar un archivo de imagen."""
    image_dir = _get_image_dir_for_deck(deck_name)
    prefix = _get_deck_prefix(deck_name)
    filename = f"{prefix}_card_{card_index}_def{def_index}.jpg"
    return image_dir / filename

def find_existing_image_path(deck_name: str, card_index: int, def_index: int) -> Optional[Path]:
    """Busca una imagen existente (jpg o jpeg)."""
    image_dir = _get_image_dir_for_deck(deck_name)
    prefix = _get_deck_prefix(deck_name)
    base_filename = f"{prefix}_card_{card_index}_def{def_index}"
    
    jpg_path = image_dir / f"{base_filename}.jpg"
    if jpg_path.exists():
        return jpg_path
    jpeg_path = image_dir / f"{base_filename}.jpeg"
    if jpeg_path.exists():
        return jpeg_path
    return None

def generate_image(prompt: str, deck_name: str, card_index: int, def_index: int, force_generation: bool) -> tuple[bool, str, Path]:
    """
    Genera una imagen si es necesario.
    Retorna (success, error_message, filepath)
    """
    existing_path = find_existing_image_path(deck_name, card_index, def_index)
    filepath = get_image_filepath(deck_name, card_index, def_index)

    if existing_path:
        logging.info(f"✅ Imagen ya existe: {existing_path.name}")
        return True, "", existing_path
    
    if not force_generation:
        return False, "Imagen no existe y la generación fue omitida (force_generation=False).", filepath
        
    if not ia_model:
        return False, "Modelo de IA no disponible.", filepath
        
    logging.info(f"🖼️ Generando imagen en '{filepath.parent.name}' para: '{prompt[:80]}...'")
    try:
        response = ia_model.generate_images(prompt=prompt, number_of_images=1, aspect_ratio="1:1")
        if not response.images:
            return False, "La API no devolvió ninguna imagen.", filepath
        response.images[0].save(filepath)
        logging.info(f"✅ Generación completada: {filepath.name}")
        return True, "", filepath
    except (Timeout, ConnectionError):
        return False, "Tiempo de espera (Timeout) o error de conexión.", filepath
    except Exception as e:
        return False, f"Error interno de la API de IA: {e}", filepath

def delete_image(deck_name: str, card_index: int, def_index: int) -> tuple[bool, str]:
    """Elimina un archivo de imagen si existe."""
    path_to_delete = find_existing_image_path(deck_name, card_index, def_index)
    if not path_to_delete:
        return True, "Archivo no encontrado."
    try:
        os.remove(path_to_delete)
        return True, "Imagen eliminada."
    except OSError as e:
        return False, f"Error al eliminar: {e}"