import logging
import os


def configure_root_logger() -> None:
    """Configure root logger with sensible defaults once."""
    if getattr(configure_root_logger, "_configured", False):
        return

    log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, log_level_str, logging.INFO)

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    # Reduce noise from third-party libs unless overridden
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    configure_root_logger._configured = True  # type: ignore[attr-defined]


def get_logger(name: str) -> logging.Logger:
    """Return a module-scoped logger, ensuring root is configured."""
    configure_root_logger()
    return logging.getLogger(name)


# Convenience default logger if needed
logger = get_logger("app")


