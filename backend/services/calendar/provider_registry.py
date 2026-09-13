from services.calendar.base import CalendarProvider, CalendarProviderType

_registry: dict[CalendarProviderType, CalendarProvider] = {}


def register_provider(provider: CalendarProvider) -> None:
    _registry[provider.provider_type] = provider


def get_provider(provider_type: CalendarProviderType) -> CalendarProvider:
    if provider_type not in _registry:
        raise ValueError(f"Provider {provider_type} not registered")
    return _registry[provider_type]


def get_all_providers() -> dict[CalendarProviderType, CalendarProvider]:
    return dict(_registry)
