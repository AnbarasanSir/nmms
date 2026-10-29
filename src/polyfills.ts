// Polyfills & fallbacks for older Android 9 and older Chrome / Chromium WebViews (Chrome 60+)

// 1. globalThis polyfill (Chrome < 71)
if (typeof globalThis === 'undefined') {
  (function () {
    if (typeof self !== 'undefined') {
      // @ts-expect-error fallback assignment
      self.globalThis = self;
    } else if (typeof window !== 'undefined') {
      // @ts-expect-error fallback assignment
      window.globalThis = window;
    } else if (typeof global !== 'undefined') {
      // @ts-expect-error fallback assignment
      global.globalThis = global;
    }
  })();
}

// 2. crypto.randomUUID fallback (Chrome < 92)
if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  try {
    window.crypto.randomUUID = function () {
      return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      ) as `${string}-${string}-${string}-${string}-${string}`;
    };
  } catch {
    // Math.random fallback if getRandomValues is restricted
    // @ts-expect-error fallback assignment
    window.crypto.randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

// 3. String.prototype.replaceAll fallback (Chrome < 85)
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (str: any, newStr: any) {
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }
    return this.replace(new RegExp(String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newStr);
  };
}

// 4. Array.prototype.at fallback (Chrome < 92)
if (!Array.prototype.at) {
  Array.prototype.at = function (index: number) {
    const n = Math.trunc(index) || 0;
    if (n < 0) return this[this.length + n];
    return this[n];
  };
}

// 5. Object.hasOwn fallback (Chrome < 93)
if (!Object.hasOwn) {
  Object.hasOwn = function (object: any, property: PropertyKey) {
    return Object.prototype.hasOwnProperty.call(object, property);
  };
}

// 6. Promise.allSettled fallback (Chrome < 79)
if (!Promise.allSettled) {
  Promise.allSettled = function (promises: Iterable<any>) {
    return Promise.all(
      Array.from(promises).map((p) =>
        Promise.resolve(p).then(
          (value) => ({ status: 'fulfilled' as const, value }),
          (reason) => ({ status: 'rejected' as const, reason })
        )
      )
    );
  };
}

// 7. queueMicrotask fallback (Chrome < 71)
if (typeof window !== 'undefined' && !window.queueMicrotask) {
  window.queueMicrotask = function (callback: () => void) {
    Promise.resolve()
      .then(callback)
      .catch((err) =>
        setTimeout(() => {
          throw err;
        }, 0)
      );
  };
}

// 8. navigator.clipboard.writeText fallback for older browsers / non-HTTPS
if (typeof navigator !== 'undefined') {
  if (!navigator.clipboard) {
    // @ts-expect-error polyfill assignment
    navigator.clipboard = {
      writeText: function (text: string) {
        return new Promise<void>((resolve, reject) => {
          try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            textarea.setAttribute('readonly', '');
            document.body.appendChild(textarea);
            textarea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (successful) {
              resolve();
            } else {
              reject(new Error('Copy command failed'));
            }
          } catch (err) {
            reject(err);
          }
        });
      },
    };
  }
}

export {};
