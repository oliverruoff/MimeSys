"""Config flow for MimeSys Digital Twin Sync integration."""
import logging
import voluptuous as vol
from typing import Any

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession
import homeassistant.helpers.config_validation as cv

from .const import DOMAIN, CONF_API_URL, CONF_ENTITY_MAPPINGS, DEFAULT_API_URL

_LOGGER = logging.getLogger(__name__)


class MimeSysSyncConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for MimeSys Sync."""

    VERSION = 1

    def __init__(self):
        """Initialize the config flow."""
        self.api_url = None
        self.entity_mappings = {}

    async def async_step_user(self, user_input=None):
        """Handle the initial step - API URL configuration."""
        errors = {}

        if user_input is not None:
            api_url = user_input[CONF_API_URL]
            
            # Validate API URL
            if await self._test_api_connection(api_url):
                self.api_url = api_url
                return await self.async_step_entities()
            else:
                errors["base"] = "cannot_connect"

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(CONF_API_URL, default=DEFAULT_API_URL): str,
            }),
            errors=errors,
            description_placeholders={
                "example": "http://localhost:8000 or http://homeassistant.local:8000"
            }
        )

    async def async_step_entities(self, user_input=None):
        """Handle entity mapping configuration."""
        if user_input is not None:
            # Parse the text input into mappings
            mappings_text = user_input.get("mappings", "")
            mappings = self._parse_mappings(mappings_text)
            
            if not mappings:
                return self.async_show_form(
                    step_id="entities",
                    data_schema=vol.Schema({
                        vol.Required("mappings"): selector.TextSelector(
                            selector.TextSelectorConfig(
                                multiline=True,
                                type=selector.TextSelectorType.TEXT
                            )
                        ),
                    }),
                    errors={"base": "no_mappings"},
                    description_placeholders={
                        "instructions": (
                            "Enter one mapping per line in the format:\\n"
                            "light_name = entity_id\\n\\n"
                            "Example:\\n"
                            "Living Room = light.living_room\\n"
                            "Kitchen = light.kitchen_ceiling"
                        )
                    }
                )
            
            # Create the config entry
            return self.async_create_entry(
                title="MimeSys Digital Twin Sync",
                data={
                    CONF_API_URL: self.api_url,
                    CONF_ENTITY_MAPPINGS: mappings,
                }
            )

        return self.async_show_form(
            step_id="entities",
            data_schema=vol.Schema({
                vol.Required("mappings"): selector.TextSelector(
                    selector.TextSelectorConfig(
                        multiline=True,
                        type=selector.TextSelectorType.TEXT
                    )
                ),
            }),
            description_placeholders={
                "instructions": (
                    "Map your MimeSys light names to Home Assistant entity IDs.\\n\\n"
                    "Enter one mapping per line in the format:\\n"
                    "light_name = entity_id\\n\\n"
                    "Example:\\n"
                    "Living Room = light.living_room\\n"
                    "Kitchen = light.kitchen_ceiling\\n"
                    "Bedroom = light.bedroom_main\\n\\n"
                    "The light names must match exactly with the names in your MimeSys 3D model."
                )
            }
        )

    def _parse_mappings(self, text: str) -> dict:
        """Parse mappings from text input."""
        mappings = {}
        for line in text.strip().split("\n"):
            line = line.strip()
            if not line or "=" not in line:
                continue
            
            parts = line.split("=", 1)
            if len(parts) == 2:
                light_name = parts[0].strip()
                entity_id = parts[1].strip()
                if light_name and entity_id:
                    mappings[light_name] = entity_id
        
        return mappings

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
        return MimeSysOptionsFlow(config_entry)


class MimeSysOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for MimeSys Sync."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        if user_input is not None:
            # Parse updated mappings
            mappings_text = user_input.get("mappings", "")
            mappings = self._parse_mappings(mappings_text)
            
            # Update config entry
            self.hass.config_entries.async_update_entry(
                self.config_entry,
                data={
                    CONF_API_URL: user_input.get(CONF_API_URL, self.config_entry.data[CONF_API_URL]),
                    CONF_ENTITY_MAPPINGS: mappings,
                }
            )
            
            return self.async_create_entry(title="", data={})

        # Convert current mappings to text
        current_mappings = self.config_entry.data.get(CONF_ENTITY_MAPPINGS, {})
        mappings_text = "\n".join([f"{name} = {entity_id}" 
                                   for name, entity_id in current_mappings.items()])

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required(CONF_API_URL, 
                           default=self.config_entry.data.get(CONF_API_URL)): str,
                vol.Required("mappings", default=mappings_text): selector.TextSelector(
                    selector.TextSelectorConfig(
                        multiline=True,
                        type=selector.TextSelectorType.TEXT
                    )
                ),
            })
        )

    def _parse_mappings(self, text: str) -> dict:
        """Parse mappings from text input."""
        mappings = {}
        for line in text.strip().split("\n"):
            line = line.strip()
            if not line or "=" not in line:
                continue
            
            parts = line.split("=", 1)
            if len(parts) == 2:
                light_name = parts[0].strip()
                entity_id = parts[1].strip()
                if light_name and entity_id:
                    mappings[light_name] = entity_id
        
        return mappings
