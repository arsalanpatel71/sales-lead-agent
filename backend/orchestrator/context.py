from dataclasses import dataclass


@dataclass
class IntentContext:
    """Everything a handler needs, parsed from the manager agent's response."""
    message: str            # the user's original message
    session_id: str
    response: str           # human-readable text from the manager
    data: dict | None       # raw structured output from the child agent
    agent_called: str       # icp_agent | communication_agent | none
