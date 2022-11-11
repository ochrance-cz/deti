document.querySelector("article").addEventListener("click", (e) => {
  const wrapper = e.target.closest(".zoomed-in");
  if (wrapper) wrapper.parentNode.removeChild(wrapper);
  else if (e.target.tagName === "IMG" && !/svg$/.test(e.target.src)) {
    const wrapper = document.createElement("DIV");
    wrapper.classList.add("zoomed-in");
    wrapper.appendChild(e.target.cloneNode());
    document.querySelector("article").appendChild(wrapper);
  }
});
