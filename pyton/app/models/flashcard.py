# app/models/flashcard.py
from pydantic import BaseModel
from typing import Optional


# --- Modelos relacionados con DECKS ---
class DeckRequest(BaseModel):
    """Modelo para cargar un deck JSON."""
    deck: str


class ResetRequest(BaseModel):
    """Modelo para resetear un deck."""
    deck: str
    confirm: bool = False


class UpdateStatusRequest(BaseModel):
    """Modelo para actualizar el estado de una tarjeta."""
    deck: str
    index: int
    learned: bool


# --- Modelos relacionados con IMÁGENES ---
class ImageGenerateRequest(BaseModel):
    """Modelo para solicitar generación o carga de imagen."""
    prompt: str
    deck: str
    index: int
    def_index: int
    force_generation: bool = False


class ImageDeleteRequest(BaseModel):
    """Modelo para solicitar eliminación de una imagen."""
    deck: str
    index: int
    def_index: int


# --- Modelo relacionado con AUDIO ---
class SynthesizeRequest(BaseModel):
    """Modelo para solicitar síntesis de texto a voz."""
    deck: str
    text: str
    voice_name: str
    model_name: Optional[str] = None
    tone: str = "default"
    verb_name: str
