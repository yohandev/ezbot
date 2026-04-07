from machine import PWM, Pin


class Servo:
    def __init__(self, pin_num):
        self.pin = Pin(pin_num, Pin.OUT)
        self.pwm = PWM(self.pin, freq=50)  # 50 Hz for servo control

    def write(self, angle):
        angle = max(0, min(180, angle))
        width_us = 1000 + angle * (1000.0 / 180.0)
        duty_fraction = width_us / 20000.0
        duty_u16 = int(duty_fraction * 65535)
        
        self.pwm.duty_u16(duty_u16)
