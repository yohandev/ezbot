from machine import PWM, Pin

PWM_FREQ = 10000


class Motor:
    def __init__(self, pin_a_num, pin_b_num):
        self.pin_a = Pin(pin_a_num, Pin.OUT, value=0)
        self.pin_b = Pin(pin_b_num, Pin.OUT, value=0)
        self.pin_a_num = pin_a_num
        self.pin_b_num = pin_b_num

        self.pwm = None
        self.reversed = None

    def write(self, speed):
        # Clamp speed between -1 and 1
        speed = max(-1.0, min(1.0, speed))
        duty_u16 = int(abs(speed) * 65535)

        if duty_u16 == 0:
            if self.pwm:
                self.pwm.deinit()
                self.pwm = None

            # Reclaim both pins as standard outputs and force them LOW
            self.pin_a = Pin(self.pin_a_num, Pin.OUT, value=0)
            self.pin_b = Pin(self.pin_b_num, Pin.OUT, value=0)
            self.reversed = None

            return

        if speed > 0 and self.reversed is not False:
            # Switch PWM pin mapping to pin A
            if self.pwm:
                self.pwm.deinit()

            self.pin_b = Pin(self.pin_b_num, Pin.OUT, value=0)
            self.pwm = PWM(Pin(self.pin_a_num), freq=PWM_FREQ)
            self.reversed = False
        elif speed < 0 and self.reversed is not True:
            # Switch PWM pin mapping to pin B
            if self.pwm:
                self.pwm.deinit()

            self.pin_b = Pin(self.pin_a_num, Pin.OUT, value=0)
            self.pwm = PWM(Pin(self.pin_b_num), freq=PWM_FREQ)
            self.reversed = True

        self.pwm.duty_u16(duty_u16)
