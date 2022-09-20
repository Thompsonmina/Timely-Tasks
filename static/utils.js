import { ethers } from "ethers";

const delay = ms => new Promise(res => setTimeout(res, ms));

export function format_to_wei(num) {
    return ethers.BigNumber.from(num * 100000).mul(1e13);
}

export async function notification(_text, self_destruct = true) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notification").textContent = _text

    if (self_destruct) {
        await delay(4000);
        notificationOff()
    }
}

export function notificationOff() {
    document.querySelector(".alert").style.display = "none"
}