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

function setupActiveAriaRoles() {
  document
    .querySelectorAll("._collapsible-nav .dropdown-menu")
    .forEach(function (el) {
      el.addEventListener("focusout", function (event) {
        var dropdown = event.target.closest(".dropdown");

        setTimeout(() => {
          if (
            !dropdown
              .querySelector(".dropdown-menu")
              .contains(document.activeElement)
          ) {
            dropdown
              .querySelector("label")
              .setAttribute("aria-expanded", false);
            dropdown.previousElementSibling.checked = false;
          }
        }, 100);
      });
    });

  document.querySelectorAll(".opener").forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      if (
        event.pointerType === "mouse" &&
        event.target.classList.contains("keyboard-only-opener")
      )
        return;

      openCollapsible(event);
    });

    el.addEventListener("keyup", function (event) {
      if (event.code == "Enter") {
        openCollapsible(event);
      }
    });
  });
}

function openCollapsible(event) {
  var id = event.target.getAttribute("for");
  var input = document.getElementById(id);
  var newState = !input.checked;

  if (event.target.classList.contains("dropdown-title")) {
    if (id !== "help-checkbox")
      document.getElementById("help-checkbox").checked = false;
    if (id !== "work-checkbox")
      document.getElementById("work-checkbox").checked = false;
  }

  input.checked = newState;

  if (event.target.classList.contains("nav-opener")) setNavOpeners(newState);
  else event.target.setAttribute("aria-expanded", newState);
}

document.addEventListener("DOMContentLoaded", function () {
  setupActiveAriaRoles();
});
