$(document).ready(function() {
    var qrcode = new QRCode(document.getElementById("qrcode"), {
        text: "strfry.shock.network npub123abcdefghhhhhhhhhhhhhhh",
        width: 157,
        height: 157,
        colorDark : "#ffffff",
        colorLight : "#000000",
        correctLevel : QRCode.CorrectLevel.H
    });
});