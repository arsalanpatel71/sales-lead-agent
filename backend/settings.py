from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    agent_builder_url: str = Field(alias="AGENT_BUILDER_URL")
    agent_builder_ws_url: str = Field(alias="AGENT_BUILDER_WS_URL")
    manager_agent_id: str = Field(default="7e1ca466-9b85-45b2-a998-c9273ba646c6", alias="MANAGER_AGENT_ID")
    post_filter_linkedin_agent_id: str = Field(alias="POST_FILTER_FOR_LINKDIN_AGENT_ID")

    apollo_io_base_url: str = Field(alias="APOLLO_IO_BASE_URL")
    apollo_io_api_key: str = Field(alias="APOLLO_IO_API_KEY")

    never_bounce_base_url: str = Field(alias="NEVER_BOUNCE_BASE_URL")
    never_bounce_api_key: str = Field(alias="NEVER_BOUNCE_API_KEY")

    apify_api_key: str = Field(default="", alias="APIFY_API_KEY")
    apify_linkedin_actor_id: str = Field(
        default="harvestapi~linkedin-post-search",
        alias="APIFY_LINKEDIN_ACTOR_ID",
    )
    apify_results_per_query: int = 20

    mongodb_url: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URL")
    db_name: str = Field(default="sales_agent", alias="DB_NAME")

    model_config = {"env_file": ".env", "populate_by_name": True, "extra": "ignore"}


settings = Settings()
