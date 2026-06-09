import logging
from collections.abc import Awaitable, Callable

from orchestrator.context import IntentContext

logger = logging.getLogger(__name__)

Handler = Callable[[IntentContext], Awaitable[dict]]

_REGISTRY: dict[str, Handler] = {}


def intent(name: str) -> Callable[[Handler], Handler]:
    """Decorator: register a coroutine as the handler for an intent."""
    def decorator(fn: Handler) -> Handler:
        _REGISTRY[name] = fn
        logger.info("[orchestrator] registered intent → %s", name)
        return fn
    return decorator


async def dispatch(name: str, ctx: IntentContext) -> dict:
    """Route to the handler for `name`, falling back to conversation."""
    handler = _REGISTRY.get(name) or _REGISTRY["conversation"]
    return await handler(ctx)
