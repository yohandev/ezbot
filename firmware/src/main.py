from .remote import Remote
from .motor import Motor


remote = Remote("My robot #0")

motion_joystick = remote.joystick()

left_motor = Motor(9, 10)
right_motor = Motor(11, 12)

# TODO: some sort of event loop to apply inputs to motor outputs
# TODO: in that loop, implement differential drive 