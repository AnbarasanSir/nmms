/**
 * Safe API and JSON response handler with Cloudflare & Network error diagnosis
 */

export interface ApiErrorDetails {
  status?: number;
  message: string;
  isCloudflare?: boolean;
}

/**
 * Fetch and safely parse JSON response.
 * Handles empty bodies, HTML error pages, Cloudflare 524/502/413 errors gracefully
 * without throwing 'Unexpected end of JSON input'.
 */
export async function fetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (networkErr: any) {
    console.error(`Network fetch failed for ${url}:`, networkErr);
    throw new Error(
      `இணைய இணைப்பு பிழை (Network Connection Error): ${networkErr.message || 'Failed to connect to server. Please check your internet connection.'}`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  // Try parsing JSON if content exists
  let data: any = null;
  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // 1. If server returned structured JSON error message
    if (data && typeof data === 'object' && (data.error || data.message)) {
      throw new Error(data.error || data.message);
    }

    // 2. Cloudflare & Proxy specific error diagnosis
    const status = res.status;
    const lowerBody = rawText.toLowerCase();

    if (status === 524 || status === 504 || lowerBody.includes('524 a timeout occurred') || lowerBody.includes('gateway time-out')) {
      throw new Error(
        'AI செயலாக்கம் நேரம் கடந்துவிட்டது (Cloudflare Gateway Timeout 524). வினாத்தாள் படங்களின் எண்ணிக்கையை குறைத்து அல்லது 3-5 வினாக்களாக முயற்சி செய்யவும்.'
      );
    }

    if (status === 413 || lowerBody.includes('413 request entity too large') || lowerBody.includes('payload too large')) {
      throw new Error(
        'பதிவேற்றப்பட்ட கோப்பு மிகவும் பெரியதாக உள்ளது (Cloudflare 413 Payload Too Large). தயவுசெய்து குறைந்த அளவிலான படங்களை பதிவேற்றவும்.'
      );
    }

    if (status === 502 || status === 520 || status === 521 || status === 522 || status === 523) {
      throw new Error(
        `Cloudflare Proxy Error (${status}): சேவையக இணைப்பு தற்காலிகமாக தடைபட்டுள்ளது. தயவுசெய்து சில வினாடிகள் கழித்து மீண்டும் முயற்சிக்கவும்.`
      );
    }

    if (status === 503) {
      throw new Error(
        'AI சேவையகம் தற்போது அதிக சுமையில் உள்ளது (503 Service Unavailable). தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
      );
    }

    if (status === 404) {
      throw new Error(`API இணைப்பு கிடைக்கவில்லை (404 Not Found: ${url}). சேவையகம் சரியாக இயங்குகிறதா என பார்க்கவும்.`);
    }

    // Generic error fallback
    throw new Error(
      `சேவையக பிழை (Server Error ${status}): ${rawText.slice(0, 150) || 'Unknown server response'}`
    );
  }

  // Response was 200 OK, but empty or not JSON
  if (data === null) {
    if (!rawText || rawText.trim().length === 0) {
      return {} as T;
    }
    throw new Error(
      `சேவையகத்திலிருந்து செல்லுபடியாகாத பதில் வந்தது (Invalid response from server: ${rawText.slice(0, 100)})`
    );
  }

  return data as T;
}

/**
 * Compress and optimize uploaded photo/image before sending over network.
 * Resizes 10-20MB mobile camera photos down to max 1600px width/height and 85% JPEG quality (~150-300KB),
 * preventing Cloudflare 413 payload rejections and 524 timeouts while preserving crisp text OCR readability for Gemini AI.
 */
export function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ id: string; name: string; size: string; base64: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          const base64Length = compressedBase64.length - (compressedBase64.indexOf(',') + 1);
          const byteLength = (base64Length * 3) / 4;

          const sizeFormatted =
            byteLength < 1024 * 1024
              ? `${(byteLength / 1024).toFixed(1)} KB`
              : `${(byteLength / (1024 * 1024)).toFixed(1)} MB`;

          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: sizeFormatted,
            base64: compressedBase64,
          });
          return;
        }

        // Fallback if canvas context fails
        const fallbackSize =
          file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: fallbackSize,
          base64: event.target?.result as string,
        });
      };

      img.onerror = () => {
        const fallbackSize =
          file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: fallbackSize,
          base64: event.target?.result as string,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
