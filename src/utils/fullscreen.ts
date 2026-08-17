/**
 * Cross-browser Fullscreen Helpers for Secure Exam Mode
 */

export const requestFullscreen = async (): Promise<boolean> => {
  try {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
      return true;
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
      return true;
    } else if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen();
      return true;
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Browser prevented automatic fullscreen request (user interaction or iframe restriction):', err);
  }
  return false;
};

export const exitFullscreen = async (): Promise<boolean> => {
  try {
    const doc = document as any;
    if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
        return true;
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
        return true;
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
        return true;
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
        return true;
      }
    }
  } catch (err) {
    console.warn('Exit fullscreen error:', err);
  }
  return false;
};

export const isFullscreenActive = (): boolean => {
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement || 
    doc.webkitFullscreenElement || 
    doc.mozFullScreenElement || 
    doc.msFullscreenElement
  );
};

export const toggleFullscreen = async (): Promise<boolean> => {
  if (isFullscreenActive()) {
    return await exitFullscreen();
  } else {
    return await requestFullscreen();
  }
};
