import asyncio
import json
from math import cos, pi, sin

import aioble as ble
from bluetooth import UUID


class Color:
    RED = "red"
    BLUE = "blue"
    GREEN = "green"
    ORANGE = "orange"
    PURPLE = "purple"
    CYAN = "cyan"


class Pane:
    CENTER = "center"
    LEFT = "left"
    RIGHT = "right"
    BOTTOM = "bottom"


class Remote:
    """
    Entry-point for the remote control. This hosts a BLE server that allows
    remote controls (yohandev.github.io/ezbot or self-hosted) to connect to
    this robot.
    """

    _EZBOT_SERVICE = UUID("19b10000-e8f2-537e-4f6c-d104768a1214")
    _INPUTS_STATE = UUID("19b10002-e8f2-537e-4f6c-d104768a1214")
    _INPUTS_METADATA = UUID("618d53d4-14bd-4376-b1a9-9ec5077aba46")

    def __init__(self, name: str) -> None:
        """
        Initiable the BLE server and begin advertising
        """
        # BLE Service     | self explanatory
        # BLE Input State | remote writes the latest snapshot of the user input
        #                 | to this characteristic every N milliseconds. Dropped
        #                 | packets are ignored (we only care about the latest).
        #                 | The format is M bytes for M inputs (e.g. joysticks,
        #                 | buttons, etc...); each input somehow encodes its entire
        #                 | state in one byte.
        # BLE Input Meta  | get the list of currently registered inputs (e.g. buttons,
        #                 | joysticks, etc...). This is intended to be read during
        #                 | the connection phase.
        #                 | Since this is infrequent, the format for this characteristic
        #                 | is just a JSON array.
        self._name = name
        self._ble_service = ble.Service(Remote._EZBOT_SERVICE)
        self._ble_inputs_state = ble.Characteristic(
            self._ble_service, Remote._INPUTS_STATE, write_no_response=True
        )
        self._ble_inputs_metadata = ble.Characteristic(
            self._ble_service, Remote._INPUTS_METADATA, read=True
        )

        self._inputs_state = []
        self._inputs_metadata = []
        self._running = False

        ble.register_services(self._ble_service)

    def _add_input(self, input, type: str, pane: str, **meta):
        """
        Add an input to this remote

        New inputs can't be added while the robot is already running, otherwise
        connected remotes risk being out of sync
        """
        assert not self._running, (
            "Cannot add inputs (joystick, button, etc...) after calling Remote.run"
        )
        
        meta.update({"type": type, "pane": pane})

        self._inputs_state.append(input)
        self._inputs_metadata.append(meta)
        return input

    def joystick(self, *, pane=Pane.CENTER) -> "Joystick":
        """
        Add a new joystick to the remote control
        """
        return self._add_input(Joystick(), "joystick", pane)

    def button(self, *, color=Color.RED, pane=Pane.BOTTOM, latching=False) -> "Button":
        """
        Add a new button to the remote control
        """
        return self._add_input(Button(), "button", pane, color=color, latching=latching)

    def slider(self, pane=Pane.RIGHT) -> "Slider":
        """
        Add a new slider to the remote control. Sliders added to the left/right
        and center panes will be vertical, and those in the bottom pane will be
        horizontal
        """
        return self._add_input(Slider(), "slider", pane)

    async def run(self) -> None:
        """
        Start the BLE server: publish metadata and advertise indefinitely,
        re-advertising after each disconnection.
        """
        self._ble_inputs_metadata.write(json.dumps(self._inputs_metadata).encode())
        self._running = True
        while True:
            print(f"Advertising as '{self._name}'...")
            async with await ble.advertise(
                250_000,
                name=self._name,
                services=[Remote._EZBOT_SERVICE],
            ) as connection:
                await self._serve(connection)

    async def _serve(self, connection) -> None:
        """
        Process incoming input-state writes for the duration of a connection.
        Resets all inputs to 0 after 100 ms of silence (sticky-input guard).
        """
        print(f"Connected to {connection.device}")
        while True:
            try:
                await self._ble_inputs_state.written(250)
                data = bytes(self._ble_inputs_state.read())
                for i, inp in enumerate(self._inputs_state):
                    if i < len(data):
                        inp._apply_state(data[i])
            except asyncio.TimeoutError:
                for inp in self._inputs_state:
                    inp._apply_state(0)
            except Exception:
                # Device disconnected or BLE error — reset inputs and exit
                for inp in self._inputs_state:
                    inp._apply_state(0)
                break


class Input:
    """
    Base class for an input. Every input's state must be representable in one byte,
    and that state is synchronized between server (this firmware) and client ("remote
    control") automatically by a Remote instance.

    If an update packet isn't received from the client for a while, this type will
    automatically revert the state to `0`, to avoid e.g. sticky inputs whenever the
    remote control is disconnected.
    """

    def _apply_state(self, state: int):
        """
        Decode and apply the given state, which was received from the remote control
        """
        raise NotImplementedError()


class Joystick(Input):
    """
    A joystick input. This has an X and Y axis and snaps back to its center position
    when released.

    State is encoded as polar coordinates:
      * bits [7:3] — 5-bit direction (0–31, 11.25° per step, 0 = east, CCW)
      * bits [2:0] — 3-bit magnitude (0–7, maps to 0.0–1.0)
    """

    def __init__(self, **info):
        """
        DO NOT CALL. Use `Remote::joystick` instead
        """
        super().__init__()

        self._x = 0.0
        self._y = 0.0
        self._info = info

    def _apply_state(self, state: int):
        direction = (state >> 3) & 0x1F
        magnitude = (state & 0x07) / 7.0
        if magnitude == 0:
            self._x = 0.0
            self._y = 0.0
        else:
            angle = direction * (2 * pi / 32)
            self._x = cos(angle) * magnitude
            self._y = sin(angle) * magnitude

    @property
    def x(self) -> float:
        """
        Get the latest X-axis value of this joystick (-1.0 to 1.0)
        """
        return self._x

    @property
    def y(self) -> float:
        """
        Get the latest Y-axis value of this joystick (-1.0 to 1.0)
        """
        return self._y


class Button(Input):
    """
    A button input.

    State is encoded as bit flags:
      * bit 0 — currently held down
      * bit 1 — pressed this frame (edge, set for one packet only)
      * bit 2 — released this frame (edge, set for one packet only)
    """

    def __init__(self):
        super().__init__()
        self._down = False
        self._pressed = False
        self._released = False

    def _apply_state(self, state: int):
        self._down = bool(state & 0x01)
        self._pressed = bool(state & 0x02)
        self._released = bool(state & 0x04)

    @property
    def down(self) -> bool:
        return self._down

    @property
    def pressed(self) -> bool:
        return self._pressed

    @property
    def released(self) -> bool:
        return self._released


class Slider(Input):
    """
    A slider input. Value ranges from 0.0 to 1.0.
    State is a single byte (0–255).
    """

    def __init__(self):
        super().__init__()
        self._value = 0.0

    def _apply_state(self, state: int):
        self._value = state / 255.0

    @property
    def value(self) -> float:
        return self._value
