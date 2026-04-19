/**
 * Translates English text to Tamil using Google Input Tools API.
 * Primarily used for name and business name transliteration.
 */
export async function translateToTamil(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";

  try {
    const url = `/api/translate?text=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.success && json.tamil) {
      return json.tamil;
    }
    
    return "";
  } catch (err) {
    console.error("Translation error:", err);
    return "";
  }
}
