/* -----------------------------
   Parallax effect
------------------------------ */
document.addEventListener("scroll", () => {
  const s = window.scrollY;
  document.querySelector(".layer-1").style.transform = `translateY(${s * 0.05}px)`;
  document.querySelector(".layer-2").style.transform = `translateY(${s * 0.1}px)`;
  document.querySelector(".layer-3").style.transform = `translateY(${s * 0.15}px)`;
});

/* -----------------------------
   Video carousel (instant switch)
------------------------------ */
const videos = document.querySelectorAll(".game-video");
const descriptions = document.querySelectorAll(".desc-item");
const prevBtn = document.querySelector(".carousel-btn.prev");
const nextBtn = document.querySelector(".carousel-btn.next");

let currentIndex = 0;

function updateCarousel(index) {
  videos.forEach((v, i) => {
    if (i === index) {
      v.classList.add("active");
      v.style.display = "block";  // show current video
    } else {
      v.classList.remove("active");
      v.style.display = "none";   // hide all others
    }
  });

  descriptions.forEach((d, i) => {
    if (i === index) d.classList.add("active");
    else d.classList.remove("active");
  });
}

// Button events
prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + videos.length) % videos.length;
  updateCarousel(currentIndex);
});

nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % videos.length;
  updateCarousel(currentIndex);
});

// Optional autoplay
setInterval(() => {
  currentIndex = (currentIndex + 1) % videos.length;
  updateCarousel(currentIndex);
}, 6000);

// Initialize
updateCarousel(currentIndex);
// Expand project images modal
const modal = document.getElementById("imgModal");
const modalImg = document.getElementById("modalImage");
const closeBtn = modal.querySelector(".close");

document.querySelectorAll(".expand-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    modal.style.display = "flex";
    modalImg.src = btn.dataset.img;
  });
});

closeBtn.addEventListener("click", () => modal.style.display = "none");

// Also close if clicked outside the image
modal.addEventListener("click", e => {
  if (e.target === modal) modal.style.display = "none";
});

/* -----------------------------
   Navigation buttons
------------------------------ */
document.getElementById("btnWork").onclick = () =>
  document.getElementById("workSection").scrollIntoView({ behavior: "smooth" });

document.getElementById("btnGames").onclick = () =>
  document.getElementById("gamesSection").scrollIntoView({ behavior: "smooth" });

document.getElementById("btnSkills").onclick = () =>
  document.getElementById("skillsSection").scrollIntoView({ behavior: "smooth" });

document.getElementById("btnContent").onclick = () =>
  document.getElementById("contentSection").scrollIntoView({ behavior: "smooth" });
