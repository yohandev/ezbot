import asyncio

from machine import Pin
from motor import Motor
from remote import Remote
from servo import Servo

# The specified name here will show up in the Bluetooth selector
remote = Remote("ROBOT_NAME_PLACEHOLDER".strip())

motion_joystick = remote.joystick()
led_button = remote.button()
servo_slider = remote.slider()

left_motor = Motor(9, 10)
right_motor = Motor(11, 12)
servo_motor = Servo(35)

led = Pin(44, Pin.OUT)


async def loop():
    # Arcade / differential drive: forward = y, turn = x
    x = motion_joystick.x
    y = motion_joystick.y
    left_motor.write(max(-1.0, min(1.0, y - x)))
    right_motor.write(max(-1.0, min(1.0, y + x)))
    
    # Servo slider
    servo_motor.write(servo_slider.value * 180)

    # Status LED
    led.value(int(led_button.down))

    await asyncio.sleep(0.020)  # 50 Hz


async def main():
    await asyncio.sleep(2)

    # Begin the BLE remote
    asyncio.create_task(remote.run())

    while True:
        await loop()


try:
    asyncio.run(main())
except KeyboardInterrupt:
    pass
finally:
    asyncio.new_event_loop()
