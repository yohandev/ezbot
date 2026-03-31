from machine import PWM, Pin


class Motor:
    def __init__(self, pin_a_num, pin_b_num):
        self.pin_a = Pin(pin_a_num, Pin.OUT)
        self.pin_b = Pin(pin_b_num, Pin.OUT)
        # Attach PWM initially to pin_a
        self.pwm_pin = self.pin_a
        self.pwm = PWM(self.pwm_pin, freq=150)  # 150 Hz for motor PWM
        self.reversed = False

    def write(self, speed):
        # Clamp speed between -1 and 1
        speed = max(-1.0, min(1.0, speed))
        duty_u16 = int(abs(speed) * 65535)

        if speed < 0:
            # Switch PWM to pin_b if not already
            if not self.reversed:
                self.pwm.deinit()  # detach current PWM
                self.pin_a.value(0)  # ensure off
                self.pwm_pin = self.pin_b
                self.pwm = PWM(self.pwm_pin, freq=150)
                self.reversed = True
        else:
            # Switch PWM back to pin_a if reversed
            if self.reversed:
                self.pwm.deinit()
                self.pin_b.value(0)
                self.pwm_pin = self.pin_a
                self.pwm = PWM(self.pwm_pin, freq=150)
                self.reversed = False

        self.pwm.duty_u16(duty_u16)
