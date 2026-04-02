from machine import Pin
from utime import sleep_ms

led = Pin(43, Pin.OUT)

while True:
    led.toggle()
    sleep_ms(250)
