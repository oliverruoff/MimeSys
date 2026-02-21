"""MimeSys Digital Twin Sync Integration."""
import asyncio
import logging
from datetime import timedelta
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, Event, ServiceCall
from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_interval
import voluptuous as vol
import homeassistant.helpers.config_validation as cv

from .const import DOMAIN, CONF_API_URL, CONF_ENTITIES

_LOGGER = logging.getLogger(__name__)
PERIODIC_RESYNC_INTERVAL = timedelta(seconds=120)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up MimeSys Sync from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    
    api_url = entry.data.get(CONF_API_URL, "http://localhost:8000")
    entities = entry.data.get(CONF_ENTITIES, [])
    
    _LOGGER.warning("=" * 60)
    _LOGGER.warning("🔵 MimeSys Sync STARTING")
    _LOGGER.warning("🔵 API URL: %s", api_url)
    _LOGGER.warning("🔵 Monitoring entities: %s", entities)
    _LOGGER.warning("=" * 60)
    
    # Create sync handler
    sync_handler = MimeSysSyncHandler(hass, api_url, entities)
    
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
            _LOGGER.debug("🔍 State change detected for %s: old=%s, new=%s", 
                         entity_id, 
                         old_state.state if old_state else "None", 
                         new_state.state)
            
            is_switch = entity_id.startswith("switch.")

            # Sync on on/off changes and light brightness/color changes
            old_on = old_state.state == "on" if old_state else False
            new_on = new_state.state == "on"
            on_off_changed = old_on != new_on

            brightness_changed = False
            color_changed = False
            if not is_switch:
                old_brightness = old_state.attributes.get("brightness") if old_state else None
                new_brightness = new_state.attributes.get("brightness")
                brightness_changed = old_brightness != new_brightness

                old_rgb = tuple(old_state.attributes.get("rgb_color")) if old_state and old_state.attributes.get("rgb_color") else None
                new_rgb = tuple(new_state.attributes.get("rgb_color")) if new_state.attributes.get("rgb_color") else None
                color_changed = old_rgb != new_rgb

            if on_off_changed or brightness_changed or color_changed:
                entity_type = "Light" if entity_id.startswith("light.") else "Switch"
                _LOGGER.warning(
                    "🔔 %s changed: %s (on_off=%s, brightness=%s, color=%s) - TRIGGERING SYNC",
                    entity_type,
                    entity_id,
                    on_off_changed,
                    brightness_changed,
                    color_changed,
                )

                # Send full sync for lights when brightness/color changed.
                # Keep on/off-only sync for simple on/off toggles.
                full_sync = (not is_switch) and (brightness_changed or color_changed)
                await sync_handler.sync_light_state(entity_id, new_state, full_sync=full_sync)
            else:
                entity_type = "light" if entity_id.startswith("light.") else "switch"
                _LOGGER.debug("⏭️ %s %s changed but on/off state is the same, skipping sync", 
                             entity_type.capitalize(), entity_id)
    
    # Subscribe to state changes and store the unsubscribe function
    unsubscribe = hass.bus.async_listen(EVENT_STATE_CHANGED, state_change_listener)
    
    # Store both handler and unsubscribe function
    async def periodic_resync(_now):
        """Periodically reconcile all monitored entities to self-heal drift."""
        _LOGGER.warning("🔁 Periodic full resync started for %d entities", len(entities))
        for entity_id in entities:
            state = hass.states.get(entity_id)
            if not state:
                _LOGGER.warning("⚠️ Periodic resync: entity not found: %s", entity_id)
                continue
            await sync_handler.sync_light_state(entity_id, state, full_sync=True)
        _LOGGER.warning("✅ Periodic full resync completed")

    periodic_unsubscribe = async_track_time_interval(hass, periodic_resync, PERIODIC_RESYNC_INTERVAL)

    hass.data[DOMAIN][entry.entry_id] = {
        "handler": sync_handler,
        "unsubscribe": unsubscribe,
        "periodic_unsubscribe": periodic_unsubscribe,
    }
    
    # Register update listener for config changes
    entry.async_on_unload(entry.add_update_listener(async_reload_entry))
    
    # Sync initial state of all monitored entities
    _LOGGER.warning("🔄 Syncing initial state of all monitored entities...")
    for entity_id in entities:
        state = hass.states.get(entity_id)
        if state:
            _LOGGER.warning("🔄 Initial sync for %s: %s", entity_id, state.state)
            # Full sync on startup to capture brightness and color
            await sync_handler.sync_light_state(entity_id, state, full_sync=True)
        else:
            _LOGGER.warning("⚠️ Entity %s not found in Home Assistant", entity_id)
    _LOGGER.warning("✅ Initial sync complete!")
    
    # Register test service for manual debugging
    async def handle_test_sync(call: ServiceCall):
        """Service to manually trigger sync for debugging."""
        entity_id = call.data.get("entity_id")
        _LOGGER.warning("🧪 MANUAL TEST SYNC called for: %s", entity_id)
        
        state = hass.states.get(entity_id)
        if state:
            _LOGGER.warning("🧪 Entity state: %s", state.state)
            _LOGGER.warning("🧪 Entity attributes: %s", state.attributes)
            # Manual test does full sync
            await sync_handler.sync_light_state(entity_id, state, full_sync=True)
        else:
            _LOGGER.error("🧪 Entity %s not found!", entity_id)
    
    hass.services.async_register(
        DOMAIN,
        "test_sync",
        handle_test_sync,
        schema=vol.Schema({
            vol.Required("entity_id"): cv.entity_id,
        })
    )
    
    _LOGGER.warning("✅ MimeSys Sync integration setup complete!")
    _LOGGER.warning("💡 Test manually: Developer Tools → Services → mimesys_sync.test_sync")
    
    return True


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the config entry when it changed."""
    _LOGGER.warning("🔄 Config changed, reloading integration...")
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.warning("🔴 Unloading MimeSys Sync integration")
    
    data = hass.data[DOMAIN].pop(entry.entry_id)
    
    # Unsubscribe from state changes
    if "unsubscribe" in data:
        data["unsubscribe"]()

    if "periodic_unsubscribe" in data:
        data["periodic_unsubscribe"]()
    
    return True


class MimeSysSyncHandler:
    """Handles syncing light states to MimeSys API."""
    
    def __init__(self, hass: HomeAssistant, api_url: str, entities: list):
        """Initialize the sync handler."""
        self.hass = hass
        self.api_url = api_url.rstrip("/")
        self.entities = entities
        self.session = async_get_clientsession(hass)
        
    async def sync_light_state(self, entity_id: str, state, full_sync: bool = False):
        """Sync a light or switch state to MimeSys API using entity_id as light name.
        
        Args:
            entity_id: The Home Assistant entity ID
            state: The entity state object
            full_sync: If True, send brightness and color. If False, only send on/off state.
        """
        try:
            # Extract entity state information
            is_on = state.state == "on"
            
            attributes = state.attributes
            is_switch = entity_id.startswith("switch.")
            
            # Build command - always include name and on state
            command = {
                "name": entity_id,
                "on": is_on
            }
            
            # Only include brightness and color during full sync or for switches
            if full_sync or is_switch:
                # Switches don't have brightness/color, so use defaults
                if is_switch:
                    brightness_pct = 100 if is_on else 0
                    rgb_color = [255, 255, 255]  # White for switches
                else:
                    # Light entity - try to get brightness and color
                    brightness = attributes.get("brightness", 255) if is_on else 0
                    brightness_pct = int((brightness / 255) * 100)
                    
                    # Get RGB color
                    rgb_color = attributes.get("rgb_color")
                    if not rgb_color:
                        # Default to white if no color specified
                        rgb_color = [255, 255, 255]
                
                command["brightness"] = brightness_pct
                command["color"] = list(rgb_color)
            
            # Build URL
            url = f"{self.api_url}/api/control/lights"
            
            entity_type = "SWITCH" if is_switch else "LIGHT"
            _LOGGER.warning("-" * 60)
            _LOGGER.warning("📤 SENDING TO MIMESYS API:")
            _LOGGER.warning("📤 Type: %s", entity_type)
            _LOGGER.warning("📤 Mode: %s", "FULL SYNC" if full_sync else "ON/OFF ONLY")
            _LOGGER.warning("📤 URL: %s", url)
            _LOGGER.warning("📤 Payload: %s", [command])
            _LOGGER.warning("📤 Entity ID (used as light name): %s", entity_id)
            _LOGGER.warning("📤 State: %s", "ON" if is_on else "OFF")
            if "brightness" in command:
                _LOGGER.warning("📤 Brightness: %d%%", command["brightness"])
            if "color" in command:
                _LOGGER.warning("📤 Color: %s", command["color"])
            _LOGGER.warning("-" * 60)
            
            retry_delays = [0, 1, 3, 10]
            for attempt, delay in enumerate(retry_delays, start=1):
                if delay > 0:
                    _LOGGER.warning("⏳ Retrying sync for %s in %ds (attempt %d/%d)", entity_id, delay, attempt, len(retry_delays))
                    await asyncio.sleep(delay)

                try:
                    async with self.session.post(
                        url,
                        json=[command],
                        headers={"Content-Type": "application/json"},
                        timeout=10,
                    ) as response:
                        response_text = await response.text()

                        _LOGGER.warning("📥 API RESPONSE:")
                        _LOGGER.warning("📥 Status: %d", response.status)
                        _LOGGER.warning("📥 Body: %s", response_text)

                        if response.status == 200:
                            data = {}
                            try:
                                data = await response.json()
                            except Exception:
                                _LOGGER.warning("⚠️ Could not parse JSON response body")

                            updated_count = data.get("updated_lights", 0)

                            if updated_count > 0:
                                _LOGGER.warning("✅ SUCCESS! Updated %d light(s) in MimeSys", updated_count)
                            else:
                                _LOGGER.error("⚠️ API CALL SUCCEEDED BUT NO LIGHTS UPDATED!")
                                _LOGGER.error("⚠️ This means the light name '%s' was NOT found in MimeSys", entity_id)
                                _LOGGER.error("⚠️ Check: Does a light in MimeSys have EXACTLY this name: '%s' ?", entity_id)
                                _LOGGER.error("⚠️ Common issues:")
                                _LOGGER.error("⚠️   - Name in MimeSys: 'Flur Licht' vs entity_id: 'light.eg_flur_licht' ❌")
                                _LOGGER.error("⚠️   - Name in MimeSys: 'light.eg_flur_licht' vs entity_id: 'light.eg_flur_licht' ✅")
                            return

                        _LOGGER.error("❌ API CALL FAILED: HTTP %d", response.status)
                        _LOGGER.error("❌ Response: %s", response_text)
                except Exception as attempt_error:
                    _LOGGER.error(
                        "❌ Sync attempt %d/%d failed for %s: %s",
                        attempt,
                        len(retry_delays),
                        entity_id,
                        attempt_error,
                    )

            _LOGGER.error("❌ All retry attempts failed for %s", entity_id)
                    
        except Exception as e:
            _LOGGER.error("❌ EXCEPTION while syncing %s to MimeSys:", entity_id, exc_info=True)
            _LOGGER.error("❌ Error: %s", str(e))
