export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function fixXSS(string) {
    // this code is shit, who cares
    const tempElement = document.createElement("span");
    tempElement.innerText = string;
    let final = tempElement.innerHTML;
    tempElement.remove();
    return final;
}