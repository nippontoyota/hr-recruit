export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or HTTP contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Make it invisible
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch (error) {
        console.error('Fallback copy failed', error);
        textArea.remove();
        return false;
      }
    }
  } catch (error) {
    console.error('Copy failed', error);
    return false;
  }
};
