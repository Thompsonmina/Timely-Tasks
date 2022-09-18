export function notification(_text) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notification").textContent = _text
}

export function notificationOff() {
    document.querySelector(".alert").style.display = "none"
}