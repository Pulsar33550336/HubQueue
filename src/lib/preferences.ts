
const NOTIFICATION_PREFERENCE_KEY = 'hubqueue_notification_preference';
const SOUND_PREFERENCE_KEY = 'hubqueue_sound_preference';

export function setNotificationPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, JSON.stringify(enabled));
  }
}

export function getNotificationPreference(): boolean {
  if (typeof window !== 'undefined') {
    const preference = window.localStorage.getItem(NOTIFICATION_PREFERENCE_KEY);
    // Defaults to true if not set
    return preference ? JSON.parse(preference) : true; 
  }
  return true;
}

export function setSoundPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, JSON.stringify(enabled));
  }
}

export function getSoundPreference(): boolean {
  if (typeof window !== 'undefined') {
    const preference = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
    // Defaults to false if not set
    return preference ? JSON.parse(preference) : false; 
  }
  return false;
}
