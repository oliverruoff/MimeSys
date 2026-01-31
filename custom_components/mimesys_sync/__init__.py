"""MimeSys Digital Twin Sync Integration."""
import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, Event
from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN, CONF_API_URL, CONF_ENTITIES

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up MimeSys Sync from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    
    api_url = entry.data.get(CONF_API_URL, "http://localhost:8000")
    entities = entry.data.get(CONF_ENTITIES, [])
    
    _LOGGER.info("Setting up MimeSys Sync integration with API: %s", api_url)
    _LOGGER.info("Monitoring entities: %s", entities)
    
    # Create sync handler
    sync_handler = MimeSysSyncHandler(hass, api_url, entities)
    hass.data[DOMAIN][entry.entry_id] = sync_handler
    
    # Register state change listener
    async def state_change_listener(event: Event):
        """Handle state changes of monitored entities."""
        entity_id = event.data.get("entity_id")
        new_state = event.data.get("new_state")
        old_state = event.data.get("old_state")
        
        if not new_state or not entity_id:
            return
            
        # Check if this entity is in our monitored list
        if entity_id in entities:
            # Only sync if the on/off state actually changed
            old_on = old_state.state == "on" if old_state else False
            new_on = new_state.state == "on"
            
            if old_on != new_on:
                await sync_handler.sync_light_state(entity_id, new_state)
    
    # Subscribe to state changes
    hass.bus.async_listen(EVENT_STATE_CHANGED, state_change_listener)
    
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    hass.data[DOMAIN].pop(entry.entry_id)
    return True


class MimeSysSyncHandler:
    """Handles syncing light states to MimeSys API."""
    
    def __init__(self, hass: HomeAssistant, api_url: str, entities: list):
        """Initialize the sync handler."""
        self.hass = hass
        self.api_url = api_url.rstrip("/")
        self.entities = entities
        self.session = async_get_clientsession(hass)
        
    async def sync_light_state(self, entity_id: str, state):
        """Sync a light state to MimeSys API using entity_id as light name."""
        try:
            # Extract light state information
            is_on = state.state == "on"
            
            attributes = state.attributes
            brightness = attributes.get("brightness", 255) if is_on else 0
            brightness_pct = int((brightness / 255) * 100)
            
            # Get RGB color
            rgb_color = attributes.get("rgb_color")
            if not rgb_color:
                # Default to white if no color specified
                rgb_color = [255, 255, 255]
            
            # Use entity_id as the light name in the API
            command = {
                "name": entity_id,
                "on": is_on,
                "brightness": brightness_pct,
                "color": list(rgb_color)
            }
            
            _LOGGER.debug("Syncing %s to MimeSys: %s", entity_id, command)
            
            # Send to API
            url = f"{self.api_url}/api/control/lights"
            async with self.session.post(
                url,
                json=[command],
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    _LOGGER.info("Successfully synced %s to MimeSys (updated %d lights)", 
                               entity_id, data.get("updated_lights", 0))
                else:
                    _LOGGER.error("Failed to sync %s to MimeSys: HTTP %d", 
                                entity_id, response.status)
                    
        except Exception as e:
            _LOGGER.error("Error syncing %s to MimeSys: %s", entity_id, str(e))
