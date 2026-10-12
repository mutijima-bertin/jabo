(() => {
  const archiveNote = document.querySelector('.archive-note');
  if (archiveNote) {
    archiveNote.addEventListener('click', () => {
      const turned = archiveNote.getAttribute('aria-pressed') !== 'true';
      archiveNote.setAttribute('aria-pressed', String(turned));
      const label = archiveNote.querySelector('span');
      if (label) label.innerHTML = turned ? 'Listen closely.<br>Look a little longer.' : 'Start with people.<br>Find the story.';
    });
  }
})();
