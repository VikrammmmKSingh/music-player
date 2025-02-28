// Initialize a new Audio object and an empty array to store song names
let currentSong = new Audio();
let songs = [];
let currFolder;

// Query the necessary DOM elements
const play = document.querySelector("#play");
const prev = document.querySelector("#prev");
const next = document.querySelector("#next");
const volumeSlider = document.querySelector("#vol"); // Volume input slider

/** Converts seconds into "minutes:seconds" format */
function convertSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

/** Fetches the list of songs from the server and updates the UI */
async function getsongs(folder) {
    currFolder = folder;
    try {
        let response = await fetch(`http://127.0.0.1:5500/songs/${folder}`);
        let text = await response.text();

        let div = document.createElement("div");
        div.innerHTML = text;
        let links = div.getElementsByTagName("a");

        songs = [];
        for (let link of links) {
            if (link.href.endsWith(".mp3")) {
                let songName = link.href.split("/").pop();
                songs.push(decodeURIComponent(songName));
            }
        }

        // Update the song list UI
        const songListUl = document.querySelector(".songlist ul");
        if (!songListUl) {
            console.error("Error: .songlist ul element not found!");
            return [];
        }

        songListUl.innerHTML = ""; // Clear previous list
        songs.forEach((song) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <img class="invert" src="img/music.svg" alt="">
                <div class="info">
                    <div>${song.replace(/%20/g, " ")}</div>
                    <div>Me</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                </div>
                <img class="invert" src="img/play.svg" alt="">
            `;
            songListUl.appendChild(li);

            li.addEventListener("click", () => {
                playmusic(song);
            });
        });

        return songs;
    } catch (error) {
        console.error("Error fetching songs:", error);
        return [];
    }
}

/** Loads and optionally plays a song */
function playmusic(track, pause = false) {
    if (!track) {
        console.error("No track specified");
        return;
    }

    let songPath = `songs/${currFolder}/${encodeURIComponent(track)}`;
    console.log(`Playing song: ${songPath}`);

    currentSong.src = songPath;
    currentSong.load();

    currentSong.onloadeddata = () => console.log("Song loaded successfully:", currentSong.src);
    currentSong.onerror = () => console.error("Error loading song:", currentSong.src);

    document.querySelector(".songinfo").textContent = track.replace(/%20/g, " ");
    document.querySelector(".timeline").textContent = "00:00 / 00:00";

    if (!pause) {
        currentSong.play().catch((error) => console.error("Playback error:", error));
        play.src = "img/pause.svg";
    }
}

/** Fetches album folders and populates UI */
async function displayAlbums() {
    let cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) {
        console.error("Error: .cardContainer element not found!");
        return;
    }

    try {
        let response = await fetch(`http://127.0.0.1:5500/songs/`);
        let text = await response.text();

        let div = document.createElement("div");
        div.innerHTML = text;
        let links = div.getElementsByTagName("a");

        cardContainer.innerHTML = "";
        for (let link of links) {
            if (link.href.includes("/songs/")) {
                let folder = link.href.split("/").slice(-1)[0];

                try {
                    let metadataResponse = await fetch(`http://127.0.0.1:5500/songs/${folder}/info.json`);
                    let metadata = await metadataResponse.json();

                    let albumHTML = `
                        <div data-folder="${folder}" class="card1">
                            <img src="songs/${folder}/cover.jpeg" alt="">
                            <h2>${metadata.title}</h2>
                            <p>${metadata.description}</p>
                        </div>`;
                    
                    cardContainer.innerHTML += albumHTML;
                } catch (jsonError) {
                    console.warn(`Warning: Could not fetch metadata for ${folder}`);
                }
            }
        }

        // Attach click event listeners
        document.querySelectorAll(".card1").forEach(card => {
            card.addEventListener("click", async () => {
                let folder = card.dataset.folder;
                console.log("Clicked album:", folder);
                let fetchedSongs = await getsongs(folder);
                if (fetchedSongs.length > 0) playmusic(fetchedSongs[0], true);
                playmusic(songs[0]);
            });
        });

    } catch (error) {
        console.error("Error fetching albums:", error);
    }
}

/** Initializes the application */
async function main() {
    let fetchedSongs = await getsongs("Romo");
    if (fetchedSongs.length > 0) playmusic(fetchedSongs[0], true);

    displayAlbums();

    // **Play Next Song Automatically When Current Ends**
    currentSong.onended = () => {
        let currentIndex = songs.indexOf(decodeURIComponent(currentSong.src.split("/").pop()));
        if (currentIndex < songs.length - 1) {
            playmusic(songs[currentIndex + 1]);
        }
    };

    // **Time Update for Seekbar**
    currentSong.addEventListener("timeupdate", () => {
        const currentTime = convertSeconds(currentSong.currentTime);
        const duration = convertSeconds(currentSong.duration);
        document.querySelector(".timeline").textContent = `${currentTime} / ${duration}`;
        document.querySelector(".circular").style.left = `${(currentSong.currentTime / currentSong.duration) * 100 || 0}%`;
    });

    // Add an event listener for hamburger
    document.querySelector(".hamburge").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })

    // **Seek Bar Click**
    document.querySelector(".seakbar").addEventListener("click", (e) => {
        let percent = (e.offsetX / e.target.offsetWidth) * 100;
        currentSong.currentTime = (currentSong.duration * percent) / 100;
        document.querySelector(".circular").style.left = `${percent}%`;
    });

    // **Play/Pause Button**
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "img/pause.svg";
        } else {
            currentSong.pause();
            play.src = "img/play.svg";
        }
    });

    // **Previous Song Button**
    prev.addEventListener("click", () => {
        let currentIndex = songs.indexOf(decodeURIComponent(currentSong.src.split("/").pop()));
        if (currentIndex > 0) {
            playmusic(songs[currentIndex - 1]);
        }
    });

    // **Next Song Button**
    next.addEventListener("click", () => {
        let currentIndex = songs.indexOf(decodeURIComponent(currentSong.src.split("/").pop()));
        if (currentIndex < songs.length - 1) {
            playmusic(songs[currentIndex + 1]);
        }
    });

    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        console.log("Setting volume to", e.target.value, "/ 100")
        currentSong.volume = parseInt(e.target.value) / 100
        if (currentSong.volume >0){
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("img/mute.svg", "img/volume.svg")
        }
    })

    // Add event listener to mute the track
    document.querySelector(".volume>img").addEventListener("click", e=>{ 
        if(e.target.src.includes("img/volume.svg")){
            e.target.src = e.target.src.replace("img/volume.svg", "img/mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else{
            e.target.src = e.target.src.replace("img/mute.svg", "img/volume.svg")
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }

    })
}

main();
