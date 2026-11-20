import { Game } from './game/Game.js';

const game = new Game(document.getElementById('c'));

async function goFullscreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    }
  } catch (e) { /* not supported / denied — game still works */ }
}

document.getElementById('play').addEventListener('click', () => {
  document.getElementById('menu').classList.add('hidden');
  goFullscreen();
  game.start();
});

document.getElementById('fs').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else goFullscreen();
});
