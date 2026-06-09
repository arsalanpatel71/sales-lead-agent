def page_params(page: int, page_size: int) -> tuple[int, int]:
    """Return (skip, limit) for a MongoDB cursor."""
    skip = max(0, (page - 1) * page_size)
    return skip, page_size


def paginated_response(items: list, total: int, page: int, page_size: int) -> dict:
    """Wrap a result list in the standard paginated envelope."""
    total_pages = max(1, -(-total // page_size))  # ceiling division
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
