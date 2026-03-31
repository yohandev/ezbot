from typing import List, Literal

import aioble as ble
from bluetooth import UUID
from typing_extensions import override

Color = Literal["red", "blue", "green", "orange", "purple", "cyan"]
Pane = Literal["center", "left", "right", "bottom"]


class Remote:
    """
    Entry-point for the remote control. This hosts a BLE server that allows
    remote controls (yohandev.github.io/ezbot or self-hosted) to connect to
    this robot.
    """

    _EZBOT_UUID = UUID("19b10000-e8f2-537e-4f6c-d104768a1214")
    _INPUTS_STATE = UUID("19b10002-e8f2-537e-4f6c-d104768a1214")
    _INPUTS_METADATA = UUID("618d53d4-14bd-4376-b1a9-9ec5077aba46")

    def __init__(self, name: str) -> None:
        """
        Initiable the BLE server and begin advertising
        """
        # BLE Service     | self explanatory
        # BLE User Inputs | remote writes the latest snapshot of the user input
        #                 | to this characteristic every N milliseconds. Dropped
        #                 | packets are ignored (we only care about the latest).
        #                 | The format is M bytes for M inputs (e.g. joysticks,
        #                 | buttons, etc...); each input somehow encodes its entire
        #                 | state in one byte.
        # BLE Info        | get the list of currently registered inputs (e.g. buttons,
        #                 | joysticks, etc...). This is intended to be read during
        #                 | the connection phase and notifies if any updates occur.
        #                 | Since this is infrequent, the format for this characteristic
        #                 | is just a JSON array.
        self._ble_service = ble.Service(Remote._EZBOT_UUID)
        self._ble_inputs_state = ble.Characteristic(
            self._ble_service, Remote._INPUTS_STATE, write_no_response=True
        )
        self._ble_inputs_metadata = ble.Characteristic(
            self._ble_service, Remote._INPUTS_METADATA, notify=True, read=True
        )

        self._inputs_state: List[Input] = []
        self._inputs_metadata = []

    def joystick(self, *, pane: Pane = "center") -> "Joystick":
        """
        Add a new joystick to the remote control
        """
        input = Joystick()
        self._inputs_state.append(input)
        self._inputs_metadata.append({"type": "joystick", "pane": pane})
        return input

    def button(
        self, *, color: Color = "red", pane: Pane = "bottom", latching=False
    ) -> "Button":
        """
        Add a new button to the remote control
        """
        input = Button()
        self._inputs_state.append(input)
        self._inputs_metadata.append({"type": "button", "color": color, "pane": pane})
        return input

    def slider(self, pane: Pane = "right") -> "Slider":
        """
        Add a new slider to the remote control. Sliders added to the left/right
        and center panes will be vertical, and those in the bottom pane will be
        horizontal
        """
        input = Slider()
        self._inputs_state.append(input)
        self._inputs_metadata.append({"type": "slider", "pane": pane})
        return input


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
    """

    def __init__(self, **info):
        """
        DO NOT CALL. Use `Remote::joystick` instead
        """
        super().__init__()

        self._x = 0
        self._y = 0
        self._info = info

    @override
    def _apply_state(self, state: int):
        # State is encoded as polar coordinates:
        #   * 5-bit direction (11.25º resolution)
        #   * 3-bit magnitude
        pass  # TODO

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
    A button input
    """

    @override
    def _apply_state(self, state: int):
        # State is encoded as follows (1-bit per field):
        #   - Down?
        #   - Pressed this frame?
        #   - Released this frame?
        pass  # TODO
