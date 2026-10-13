import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeMediaUrl, embedUrl, mediaKind } from '../src/lib/project-media.ts';
import { localizedPath, swapLocaleInPath } from '../src/lib/locale.ts';

test('media accepts local uploads and rejects executable or protocol-relative URLs', () => {
  assert.equal(safeMediaUrl('javascript:alert(1)'), null);
  assert.equal(safeMediaUrl('//evil.test/a.mp4'), null);
  assert.equal(safeMediaUrl('/\\evil.test/a.mp4'), null);
  assert.equal(safeMediaUrl('/uploads/a.mp4'), '/uploads/a.mp4');
});

test('embeds are canonicalized to trusted players, never lookalike hosts', () => {
  assert.equal(embedUrl('https://youtu.be/abcdefghijk'), 'https://www.youtube-nocookie.com/embed/abcdefghijk');
  assert.equal(embedUrl('https://youtube.com.evil.test/watch?v=abcdefghijk'), null);
  assert.equal(embedUrl('https://vimeo.com/12345'), 'https://player.vimeo.com/video/12345');
});

test('signed video and caption URLs classify by pathname', () => {
  assert.equal(mediaKind('/uploads/film.mp4?token=abc'), 'video');
  assert.equal(mediaKind('https://media.test/story.rw.vtt?x=1'), 'captions');
  assert.equal(mediaKind('/uploads/photo.webp'), 'image');
});

test('localized project paths and locale swaps retain query before fragment', () => {
  assert.equal(localizedPath('rw', '/?service=one#enquiry'), '/rw?service=one#enquiry');
  assert.equal(localizedPath('rw', '/portfolio/project-1'), '/rw/portfolio/project-1');
  assert.equal(swapLocaleInPath('/en/portfolio/project-1?x=1#film', 'rw'), '/rw/portfolio/project-1?x=1#film');
});
