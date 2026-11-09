import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

/** Offer a text file to the person: the share sheet on Android, a download in a browser. Resolves true when it was handed over. */
export async function saveTextFile(name: string, text: string, mime = 'application/json'): Promise<boolean> {
  try {
    if (isNative()) {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const w = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: name, url: w.uri, dialogTitle: name });
      return true;
    }
    const blob = new Blob([text], { type: mime }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch (e) { const m = e instanceof Error ? e.message : String(e); return /cancel|dismiss/i.test(m) ? false : false; }
}
