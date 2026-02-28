var page = document.querySelector('body').dataset.page;
setPageClass();

document.querySelector('nav.main').addEventListener('mouseover', function (e) {
  var link = e.target.getAttribute('href');
  if (link) {
    document.querySelector('body').className = link
      .replace(/\//g, '_')
      .replace(/^_+|_+$/gm, '')
      .split('_')[0];
  }
});

document.querySelector('nav.main').addEventListener('mouseout', function (e) {
  setPageClass();
});

document.querySelector('body').addEventListener('click', function (e) {
  if (e.target.tagName == 'path' || e.target.tagName == 'rect') {
    if (e.target.style.fill == 'rgb(255, 255, 255)')
      e.target.style.fill = 'rgb(0, 133, 118)';
    else if (e.target.style.fill == 'rgb(0, 133, 118)')
      e.target.style.fill = 'rgb(114, 114, 114)';
    else if (e.target.style.fill == 'rgb(114, 114, 114)')
      e.target.style.fill = 'rgb(225, 125, 40)';
    else if (e.target.style.fill == 'rgb(225, 125, 40)')
      e.target.style.fill = 'rgb(170, 5, 70)';
    else if (e.target.style.fill == 'rgb(170, 5, 70)')
      e.target.style.fill = 'rgb(0, 95, 140)';
    else if (e.target.style.fill == 'rgb(0, 95, 140)')
      e.target.style.fill = 'rgb(175, 195, 45)';
    else if (e.target.style.fill == 'rgb(175, 195, 45)')
      e.target.style.fill = 'rgb(255, 255, 255)';
  }
});

function setPageClass() {
  document.querySelector('body').className = page ? page : 'home';
}
