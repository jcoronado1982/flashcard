# Archivo: app/core/config.py
import os
import sys
import logging
from pathlib import Path
from pydantic_settings import BaseSettings

# Configuración de Logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# --- Carga de Configuración ---
class Settings(BaseSettings):
    PROJECT_ID: str
    REGION: str = "us-central1"
    
    CARD_IMAGES_BASE_DIR: str = "card_images"
    AUDIO_DIR: str = "card_audio"
    STATIC_DIR: str = "static"
    JSON_SUB_DIR: str = "json"
    SERVER_TIMEOUT: int = 300
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    JSON_DIR_PATH: Path = BASE_DIR / STATIC_DIR / JSON_SUB_DIR

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()

# --- Crear Directorios ---
os.makedirs(settings.AUDIO_DIR, exist_ok=True)
os.makedirs(settings.JSON_DIR_PATH, exist_ok=True)
os.makedirs(settings.CARD_IMAGES_BASE_DIR, exist_ok=True)


# --- Inicialización de Clientes de Google ---
try:
    import vertexai
    from vertexai.preview.vision_models import ImageGenerationModel
    from google.cloud import texttospeech

    vertexai.init(project=settings.PROJECT_ID, location=settings.REGION)
    ia_model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-002")
    tts_client = texttospeech.TextToSpeechClient()
    
    logging.info("✅ Vertex AI (Imagen) inicializado.")
    logging.info("✅ Google Cloud Text-to-Speech inicializado.")

except ImportError as e:
    logging.critical(f"FATAL: Falta una o más librerías. {e}. Instala desde requirements.txt")
    sys.exit(1)
except Exception as e:
    logging.error(f"❌ Error al inicializar Google Cloud Services: {e}")
    ia_model = None
    tts_client = None