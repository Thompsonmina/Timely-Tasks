
const delay = ms => new Promise(res => setTimeout(res, ms));

export function notification(_text, self_destruct = true) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notification").textContent = _text

    if (self_destruct) {
        delay(4000);
        notificationOff()
    }
}

export function notificationOff() {
    document.querySelector(".alert").style.display = "none"
}