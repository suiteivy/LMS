/**
 * Formats notification titles and messages by stripping generic prefixes
 * like "System notification" or raw type labels, ensuring plain-language
 * clarity across all notification displays.
 */
export function formatNotificationDisplay(item: { title?: string | null; message?: string | null; type?: string | null }) {
  const genericPrefixRegex = /^(system\s*notification|system\s*alert|notification|alert|update)\s*[:\-–—]?\s*/i;

  let rawTitle = (item?.title || '').trim();
  let rawMessage = (item?.message || '').trim();

  // Strip generic prefixes
  let cleanTitle = rawTitle.replace(genericPrefixRegex, '').trim();
  let cleanMessage = rawMessage.replace(genericPrefixRegex, '').trim();

  // If the title was strictly generic (e.g. "System Notification"), fallback cleanly
  const isTitleGeneric = !cleanTitle || /^(system\s*notification|system\s*alert|notification)$/i.test(rawTitle);

  if (isTitleGeneric) {
    if (cleanMessage) {
      cleanTitle = cleanMessage;
      cleanMessage = '';
    } else {
      cleanTitle = 'School Notice';
    }
  }

  return {
    title: cleanTitle,
    message: cleanMessage && cleanMessage !== cleanTitle ? cleanMessage : '',
  };
}
