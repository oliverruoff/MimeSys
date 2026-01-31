"""Config flow for MimeSys Digital Twin Sync integration."""
import logging
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN, CONF_API_URL, CONF_ENTITIES, DEFAULT_API_URL

_LOGGER = logging.getLogger(__name__)


class MimeSysSyncConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for MimeSys Sync."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step - select entities to sync."""
        errors = {}

        if user_input is not None:
            api_url = user_input.get(CONF_API_URL, DEFAULT_API_URL)
            entities = user_input.get(CONF_ENTITIES, [])
            
            # Validate API URL
            if not await self._test_api_connection(api_url):
                errors["base"] = "cannot_connect"
            elif not entities:
                errors["base"] = "no_entities"
            else:
                # Create the config entry
                return self.async_create_entry(
                    title="MimeSys Digital Twin Sync",
                    data={
                        CONF_API_URL: api_url,
                        CONF_ENTITIES: entities,
                    }
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(CONF_API_URL, default=DEFAULT_API_URL): str,
                vol.Required(CONF_ENTITIES): selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        domain=["light", "switch"],
                        multiple=True
                    )
                ),
            }),
            errors=errors,
            description_placeholders={
                "info": "Select light or switch entities to sync with MimeSys. The entity ID will be used as the light name in the API."
            }
        )

    async def _test_api_connection(self, api_url: str) -> bool:
        """Test if we can connect to the MimeSys API."""
        try:
            session = async_get_clientsession(self.hass)
            url = f"{api_url.rstrip('/')}/api/homes"
            
            async with session.get(url, timeout=5) as response:
                return response.status == 200
        except Exception as e:
            _LOGGER.error("Failed to connect to MimeSys API: %s", e)
            return False

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return MimeSysOptionsFlow()


class MimeSysOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for MimeSys Sync."""

    # REMOVED __init__ - the base class handles config_entry as a property
    # This was causing: AttributeError: property 'config_entry' of 'MimeSysOptionsFlow' object has no setter

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        if user_input is not None:
            # Update config entry
            self.hass.config_entries.async_update_entry(
                self.config_entry,
                data={
                    CONF_API_URL: user_input.get(CONF_API_URL),
                    CONF_ENTITIES: user_input.get(CONF_ENTITIES, []),
                }
            )
            
            return self.async_create_entry(title="", data={})

        current_entities = self.config_entry.data.get(CONF_ENTITIES, [])
        current_api_url = self.config_entry.data.get(CONF_API_URL, DEFAULT_API_URL)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required(CONF_API_URL, default=current_api_url): str,
                vol.Optional(CONF_ENTITIES, default=current_entities): selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        domain=["light", "switch"],
                        multiple=True
                    )
                ),
            })
        )
