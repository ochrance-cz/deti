var page = document.querySelector("body").dataset.page;
setPageClass();

document.querySelector("nav.main").addEventListener("mouseover", function (e) {
  var link = e.target.getAttribute("href");
  if (link) {
    document.querySelector("body").className = link
      .replace(/\//g, "_")
      .replace(/^_+|_+$/gm, "")
      .split("_")[0];
  }
});

document.querySelector("nav.main").addEventListener("mouseout", function (e) {
  setPageClass();
});

document.querySelector("body").addEventListener("click", function (e) {
  if (e.target.tagName == "path" || e.target.tagName == "rect") {
    if (e.target.style.fill == "rgb(255, 255, 255)")
      e.target.style.fill = "rgb(0, 133, 118)";
    else if (e.target.style.fill == "rgb(0, 133, 118)")
      e.target.style.fill = "rgb(114, 114, 114)";
    else if (e.target.style.fill == "rgb(114, 114, 114)")
      e.target.style.fill = "rgb(225, 125, 40)";
    else if (e.target.style.fill == "rgb(225, 125, 40)")
      e.target.style.fill = "rgb(170, 5, 70)";
    else if (e.target.style.fill == "rgb(170, 5, 70)")
      e.target.style.fill = "rgb(0, 95, 140)";
    else if (e.target.style.fill == "rgb(0, 95, 140)")
      e.target.style.fill = "rgb(175, 195, 45)";
    else if (e.target.style.fill == "rgb(175, 195, 45)")
      e.target.style.fill = "rgb(255, 255, 255)";
  }
});

function setPageClass() {
  document.querySelector("body").className = page ? page : "home";
}

/* links */
var links = document.links;

for (var i = 0, linksLength = links.length; i < linksLength; i++) {
  if (links[i].hostname != window.location.hostname) {
    links[i].target = "_blank";
  }
}

/* search */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function search(term, index) {
  var foundUrls = [];

  var foundInTitles = index.reduce(function (acc, item) {
    if (
      item.name &&
      acc.length < 5 &&
      item.name.match(new RegExp(escapeRegExp(term), "i"))
    ) {
      acc.push(item);
      foundUrls.push(item.url);
    }
    return acc;
  }, []);

  return index
    .reduce(function (acc, item) {
      if (
        foundUrls.indexOf(item.url) === -1 &&
        acc.length < 5 &&
        item.text.match(new RegExp(escapeRegExp(term), "i"))
      ) {
        acc.push(item);
        foundUrls.push(item.url);
      }
      return acc;
    }, foundInTitles)
    .map(function (result) {
      return {
        name: result.name,
        url: result.url,
        text: getDescription(term, result.text),
      };
    });
}

function getDescription(term, text) {
  var match = new RegExp(
    "(.{1,60})(" + escapeRegExp(term) + ")(.{1,60})",
    "iu",
  ).exec(text);

  if (match) {
    return (
      "…" +
      (
        match[1].substring(match[1].indexOf(" ")) +
        "<b>" +
        match[2] +
        "</b>" +
        match[3].substring(0, match[3].lastIndexOf(" "))
      ).replace(/^[\|\s\.,„“]+|[\|\s\.,„“]+$/g, "") +
      "…"
    );
  }

  var desc = text.substring(0, 120);
  return desc.substring(0, desc.lastIndexOf(" ")).trim() + "…";
}

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function clearResults(wrapper) {
  while (wrapper.firstChild) {
    wrapper.removeChild(wrapper.firstChild);
  }
}

function showResults(results, term, wrapper) {
  clearResults(wrapper);

  if (results.length == 0) {
    var p = document.createElement("P");
    p.innerHTML =
      "Hledáte <b>" +
      term +
      "</b>, ale nic takového tu nemáme. Zkuste zadání změnit anebo využijte menu.";
    wrapper.appendChild(p);

    return false;
  }

  var els = results
    .map(function (res) {
      var li = document.createElement("LI");
      var a = document.createElement("A");
      a.setAttribute("href", res.url);
      a.innerHTML = res.name;
      li.appendChild(a);

      if (res.text) {
        var span = document.createElement("SPAN");
        span.innerHTML = " „" + res.text + "“";

        li.appendChild(span);
      }

      return li;
    })
    .forEach(function (el) {
      wrapper.appendChild(el);
    });
}

var index = [];
var NOPE = 0,
  LOADING = 1,
  READY = 2;
var searchReady = NOPE;
var searchField = document.querySelector("#search input");
var searchResults = document.querySelector(".search-results");
var searchTerm = "";
var request = new XMLHttpRequest();

request.onreadystatechange = function () {
  if (request.readyState === 4) {
    if (request.status === 200) {
      index = JSON.parse(request.responseText);
      searchReady = READY;
      searchResults.classList.remove("loading");
    } else {
      console.log(
        "An error occurred during your request: " +
          request.status +
          " " +
          request.statusText,
      );
    }
  }
};

request.open("Get", "/search.index.json?v=2");

searchField.addEventListener("focus", function () {
  if (searchReady == NOPE) {
    searchResults.classList.add("loading");
    searchReady = LOADING;
    request.send();
  }
});

searchField.addEventListener(
  "input",
  debounce(function () {
    if (searchReady == READY) {
      var term = searchField.value;

      if (term == "") clearResults(searchResults);
      else showResults(search(term, index), term, searchResults);
    }
  }, 200),
);
