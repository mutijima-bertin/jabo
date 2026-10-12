'use strict';
const reviewState = new URLSearchParams(location.search).get('state');
const menu = document.querySelector('.menu');
const mobileNav = document.querySelector('#mobile-nav');
menu.hidden = false;
function closeMenu() { mobileNav.hidden = true; menu.setAttribute('aria-expanded', 'false'); }
menu.addEventListener('click', () => { mobileNav.hidden = !mobileNav.hidden; menu.setAttribute('aria-expanded', String(!mobileNav.hidden)); });
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
mobileNav.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menu.focus(); } });
const stages = {
  moment: ['01 / THE MOMENT', 'First, pay attention.', 'The hands, the water, the shared effort. Before choosing a frame, notice what brings the scene together.'],
  decision: ['02 / THE DECISION', 'Choose what matters.', 'Move closer to the hands and the net. The same scene becomes a study of people working together.'],
  image: ['03 / THE IMAGE', 'Let the story breathe.', 'Open the frame again. The people and their surroundings belong to one story; the complete image gives both room.']
};
document.querySelectorAll('button[data-stage]').forEach(button => { button.disabled = false; });
document.querySelectorAll('button[data-stage]').forEach(button => button.addEventListener('click', () => {
  const stage = button.dataset.stage;
  document.querySelector('.signal-image').dataset.stage = stage;
  document.querySelectorAll('button[data-stage]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  const [label, title, description] = stages[stage];
  document.querySelector('#stage-label').textContent = label;
  document.querySelector('#stage-title').textContent = title;
  document.querySelector('#stage-description').textContent = description;
}));
let dialogOpener;
const closeFocus = new WeakMap();
function openDialog(dialog, opener) { dialogOpener = opener; dialog.showModal(); document.body.classList.add('modal-open'); }
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); const target = closeFocus.get(dialog) || dialogOpener; closeFocus.delete(dialog); target?.focus({preventScroll:true}); });
});
const projects = {
  fieldwork: {title:'People at work', image:'fieldwork', alt:'People lifting a fishing net together', description:'Hands, water, shared effort. An archive photograph that places people and their surroundings in the same story.'},
  summit: {title:'A room full of ideas', image:'summit', alt:'A panel discussion at Africa Summit 2018', description:'A conversation on stage at Africa Summit 2018. A view of the people at the centre of a public event.'},
  portrait: {title:'A point of view', image:'portrait', alt:'A woman speaking with an expressive gesture', description:'An expression, a gesture, a moment of conversation. An archive portrait with a person at its centre.'}
};
const projectDialog = document.querySelector('#project-dialog');
document.querySelectorAll('[data-project]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); const project = projects[link.dataset.project];
  document.querySelector('#project-title').textContent = project.title;
  const image = document.querySelector('#project-image'); image.parentElement.classList.remove('failed'); image.alt = project.alt; image.src = `assets/${project.image}-1440.webp`;
  document.querySelector('#project-description').textContent = project.description;
  openDialog(projectDialog, link);
}));
function closeAndVisit(dialog, hash) { closeFocus.set(dialog, document.querySelector(`${hash} input, ${hash} a`)); dialog.close(); document.querySelector(hash).scrollIntoView(); }
document.querySelector('#project-enquire').addEventListener('click', event => { event.preventDefault(); closeAndVisit(projectDialog, '#enquiry'); });
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  const checkbox = [...document.querySelectorAll('input[name="service"]')].find(input => input.value === link.dataset.service);
  checkbox.checked = true;
}));
const form = document.querySelector('#brief-form');
form.querySelector('button[type="submit"]').disabled = false;
const briefDialog = document.querySelector('#brief-dialog');
let preparedBrief = '';
form.addEventListener('submit', event => {
  event.preventDefault();
  const name = form.elements.name; const idea = form.elements.idea;
  name.setCustomValidity(name.value.trim() ? '' : 'Please enter your name.');
  idea.setCustomValidity(idea.value.trim().length >= 15 ? '' : 'Please add a little more detail (at least 15 characters).');
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const rows = [['Name',values.get('name').trim()],['Organisation',values.get('organisation').trim() || 'Not specified'],['Email',values.get('email').trim()],['Interested in',values.getAll('service').join(', ') || 'Let’s explore'],['The idea',values.get('idea').trim()]];
  const summary = document.querySelector('#brief-summary'); summary.replaceChildren();
  rows.forEach(([label,value]) => { const dt = document.createElement('dt'); const dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; summary.append(dt,dd); });
  preparedBrief = 'CREATIVE SOUND STUDIO — PROJECT BRIEF\nPrepared locally. Not submitted or booked.\n\n' + rows.map(([label,value]) => `${label}\n${value}`).join('\n\n');
  openDialog(briefDialog, form.querySelector('button[type="submit"]'));
});
form.addEventListener('input', event => event.target.setCustomValidity?.(''));
document.querySelector('#edit-brief').addEventListener('click', () => { closeFocus.set(briefDialog, form.elements.idea); briefDialog.close(); });
document.querySelector('#download-brief').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([preparedBrief], {type:'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'creative-sound-studio-project-brief.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
// Production integration supplies an approved film and captions. The prototype never fetches a guessed source.
const filmButton = document.querySelector('.film-open'); filmButton.hidden = false;
const filmDialog = document.querySelector('#film-dialog');
const video = document.querySelector('#studio-video');
const filmStatus = document.querySelector('#film-status');
function filmUnavailable() { video.hidden = true; filmDialog.querySelector('.film-player').classList.remove('loading'); filmStatus.textContent = 'The film could not be loaded. You can still explore the photographs and start a project brief.'; }
video.addEventListener('error', filmUnavailable);
filmButton.addEventListener('click', () => openDialog(filmDialog, filmButton));
filmDialog.addEventListener('close', () => video.pause());
document.querySelector('#film-stills').addEventListener('click', event => { event.preventDefault(); closeAndVisit(filmDialog, '#work'); });
document.querySelectorAll('.media img').forEach(image => {
  image.addEventListener('error', () => image.closest('.media').classList.add('failed'));
  image.addEventListener('load', () => { if (reviewState !== 'missing-images') image.closest('.media').classList.remove('failed'); });
  if (image.complete && image.getAttribute('src') && image.naturalWidth === 0) image.closest('.media').classList.add('failed');
});
// Explicit review states, available only through the separate prototype review page.
if (reviewState === 'reduced-motion') document.documentElement.classList.add('reduce-motion');
if (reviewState === 'missing-images') document.querySelectorAll('.media').forEach(media => media.classList.add('failed'));
if (reviewState === 'film-error') filmUnavailable();
if (reviewState === 'film-loading') { filmDialog.querySelector('.film-player').classList.add('loading'); filmStatus.textContent = 'Loading film… You can close this preview and continue exploring.'; }
