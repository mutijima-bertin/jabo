(() => {
  const menu = document.querySelector('.menu');
  const mobile = document.querySelector('#mobile-links');
  if (menu && mobile) {
    menu.addEventListener('click', () => {
      mobile.hidden = !mobile.hidden;
      menu.setAttribute('aria-expanded', String(!mobile.hidden));
    });
    mobile.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      mobile.hidden = true;
      menu.setAttribute('aria-expanded', 'false');
    }));
  }
  const reveal = document.querySelector('.reveal');
  if (reveal) {
    reveal.addEventListener('click', () => {
      const open = reveal.getAttribute('aria-pressed') !== 'true';
      reveal.setAttribute('aria-pressed', String(open));
      const frame = document.querySelector('.frame');
      if (frame) frame.classList.toggle('open', open);
      reveal.innerHTML = `${open ? 'Return to the rhythm' : 'Open the frame'} <span aria-hidden="true">↗</span>`;
    });
  }
  const enquiry = document.querySelector('.enquire');
  const dialog = document.querySelector('dialog');
  if (enquiry && dialog) {
    enquiry.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('close', () => enquiry.focus());
  }
})();
