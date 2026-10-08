import { createOptimizedPicture } from '../../scripts/aem.js';

const DEFAULT_LABEL = 'A 60-second film about cq-mev';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Runs fn after window load plus a short idle delay, so the video never competes with LCP. */
function afterLoadIdle(fn) {
  const idle = () => setTimeout(() => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2000 });
    else fn();
  }, 1500);
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

function formatTime(seconds) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function button(className, text) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `video-hero-btn ${className}`;
  b.textContent = text;
  return b;
}

function decorateCopy(cell) {
  cell.classList.add('video-hero-copy');
  const h1 = cell.querySelector('h1');
  const first = cell.firstElementChild;
  if (h1 && first && first !== h1 && first.tagName === 'P' && !first.classList.contains('button-wrapper')) {
    first.classList.add('video-hero-eyebrow');
  }
  const ctas = [...cell.querySelectorAll(':scope > p.button-wrapper')];
  if (ctas.length) {
    const row = document.createElement('div');
    row.className = 'video-hero-ctas';
    ctas[0].before(row);
    row.append(...ctas);
  }
}

function decorateMedia(cell) {
  const link = [...cell.querySelectorAll('a[href]')].find((a) => {
    try {
      return new URL(a.getAttribute('href'), window.location.href).pathname.endsWith('.mp4');
    } catch {
      return false;
    }
  });
  const img = cell.querySelector('picture img');
  const captionP = [...cell.querySelectorAll('p')]
    .find((p) => !p.querySelector('picture, a[href]') && p.textContent.trim());
  const caption = captionP ? captionP.textContent.trim() : '';

  const frame = document.createElement('div');
  frame.className = 'video-hero-frame';
  if (img) {
    frame.append(createOptimizedPicture(img.src, img.alt, true, [
      { media: '(min-width: 900px)', width: '1080' },
      { width: '750' },
    ]));
  }

  const media = document.createElement('div');
  media.className = 'video-hero-media';
  media.append(frame);
  if (caption) {
    const captionEl = document.createElement('p');
    captionEl.className = 'video-hero-caption';
    captionEl.textContent = caption;
    media.append(captionEl);
  }
  cell.classList.add('video-hero-media-cell');
  cell.replaceChildren(media);
  if (!link) return;

  // keep the authored href (query kept, media hash such as #width=1080 dropped)
  const url = new URL(link.getAttribute('href'), window.location.href);
  url.hash = '';
  const src = url.href;

  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.preload = 'none';
  video.setAttribute('aria-label', caption || DEFAULT_LABEL);
  frame.append(video);

  const sound = button('primary video-hero-sound', '');
  const glyph = document.createElement('span');
  glyph.className = 'video-hero-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = '▶';
  const duration = document.createElement('span');
  duration.className = 'video-hero-duration';
  duration.textContent = '1:00';
  sound.append(glyph, 'Play with sound ', duration);
  const toggle = button('secondary video-hero-toggle', 'Pause');
  const mute = button('secondary video-hero-mute', 'Mute');
  const controls = document.createElement('div');
  controls.className = 'video-hero-controls';
  controls.append(sound, toggle, mute);
  frame.append(controls);

  let mode = 'preview'; // 'preview' (muted loop or poster) or 'sound'
  let inView = false;
  let userPaused = false;

  const ensureSrc = () => { if (!video.getAttribute('src')) video.src = src; };
  const motionOK = () => !reducedMotion.matches;

  function render() {
    const moving = !video.paused && !video.ended;
    frame.classList.toggle('is-moving', moving);
    const preview = mode === 'preview';
    const active = document.activeElement;
    sound.hidden = !preview;
    toggle.hidden = preview && !moving && !userPaused;
    toggle.textContent = moving ? 'Pause' : 'Play';
    mute.hidden = preview;
    mute.textContent = video.muted ? 'Unmute' : 'Mute';
    // keep keyboard focus in the controls when the focused button hides
    if (controls.contains(active) && active.hidden) {
      (preview ? sound : toggle).focus({ preventScroll: true });
    }
  }

  function play() {
    ensureSrc();
    return video.play().catch(() => {
      // play() rejected: stay on the poster
      video.classList.remove('is-playing');
      if (mode === 'sound') {
        mode = 'preview';
        video.muted = true;
        video.loop = true;
      }
      render();
    });
  }

  function updatePreview() {
    if (mode !== 'preview' || !video.getAttribute('src')) return;
    if (motionOK() && inView && !userPaused) play();
    else if (!video.paused) video.pause();
  }

  function toPreview() {
    mode = 'preview';
    userPaused = false;
    video.muted = true;
    video.loop = true;
    video.currentTime = 0;
    if (motionOK() && inView) {
      play();
    } else {
      video.pause();
      video.classList.remove('is-playing');
    }
    render();
  }

  sound.addEventListener('click', () => {
    mode = 'sound';
    userPaused = false;
    ensureSrc();
    video.currentTime = 0;
    video.muted = false;
    video.loop = false;
    render();
    play();
  });

  toggle.addEventListener('click', () => {
    if (video.paused || video.ended) {
      userPaused = false;
      play();
    } else {
      if (mode === 'preview') userPaused = true;
      video.pause();
    }
  });

  mute.addEventListener('click', () => {
    video.muted = !video.muted;
    render();
  });

  video.addEventListener('playing', () => {
    video.classList.add('is-playing');
    render();
  });
  video.addEventListener('pause', render);
  // a browser that cannot decode the film (no H.264) keeps the poster and drops dead controls
  video.addEventListener('error', () => {
    video.classList.remove('is-playing');
    controls.hidden = true;
  });
  video.addEventListener('ended', () => { if (mode === 'sound') toPreview(); });
  video.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(video.duration)) duration.textContent = formatTime(video.duration);
  });

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updatePreview();
  }, { threshold: 0.25 }).observe(frame);
  reducedMotion.addEventListener('change', updatePreview);

  afterLoadIdle(() => {
    ensureSrc();
    updatePreview();
  });
  render();
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const [copy, media] = row.children;
  if (copy) decorateCopy(copy);
  if (media) decorateMedia(media);
}
