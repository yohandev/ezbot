import asyncio

from remote import Remote
from motor import Motor


remote = Remote("My robot #0")

motion_joystick = remote.joystick()

left_motor  = Motor(9, 10)
right_motor = Motor(11, 12)


async def control_loop():
    while True:
        x = motion_joystick.x
        y = motion_joystick.y
        # Arcade / differential drive: forward = y, turn = x
        left_motor.write( max(-1.0, min(1.0, y + x)))
        right_motor.write(max(-1.0, min(1.0, y - x)))
        await asyncio.sleep(0.020)  # 50 Hz


async def main():
    await asyncio.gather(remote.run(), control_loop())


asyncio.run(main())
