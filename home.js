const backgroundImages = 
[
    "images/Input1.png",
    "images/Input2.png",
    "images/Input3.png",
    "images/Input4.png",
    "images/Input5.png",
    "images/Input6.png",
]

let currentBackground = Math.floor(Math.random() * backgroundImages.length);

function nextBackground(){
    currentBackground = (currentBackground + 1) % backgroundImages.length;
    let image = document.getElementById("strata");
    image.src = backgroundImages[currentBackground];
    console.log("next!");
}

function prevBackground(){
    currentBackground = (currentBackground - 1 + backgroundImages.length) % backgroundImages.length;
    let image = document.getElementById("strata");
    image.src = backgroundImages[currentBackground];
    console.log(image);
}