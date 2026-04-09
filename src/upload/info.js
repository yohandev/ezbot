import pcbInstructions from "../assets/info/pcb_instructions.mp4";
import batteryImg from "../assets/info/battery.png";
import dcMotorImg from "../assets/info/dc_motor.png";
import servoMotorImg from "../assets/info/servo_motor.png";
import enclosureImg from "../assets/info/enclosure.png";

document.getElementById("info-video-pcb-src").src = pcbInstructions;
document.getElementById("info-video-pcb").load();

document.getElementById("info-img-battery").src = batteryImg;
document.getElementById("info-img-dc-motors").src = dcMotorImg;
document.getElementById("info-img-servo-motors").src = servoMotorImg;
document.getElementById("info-img-enclosure").src = enclosureImg;