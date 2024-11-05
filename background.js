// Constants
const DEFAULT_SETTINGS = {
  isActive: true,
  soundEnabled: false,
  nextNotificationTime: null,
  notificationInterval: 3,
  notificationDuration: 30000, // 30 seconds
  maxSnoozeMinutes: 180,
  defaultSnoozeOptions: [10, 30]
};

// State management
let state = { ...DEFAULT_SETTINGS };

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set(DEFAULT_SETTINGS);
  setupAlarm();
});

// Restore state when service worker wakes up
chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (result) => {
  state = { ...DEFAULT_SETTINGS, ...result };
  if (state.isActive) {
    setupAlarm();
  }
});

// Alarm management
function setupAlarm(immediately = false) {
  chrome.alarms.clear('timeNotification', () => {
    chrome.alarms.create('timeNotification', {
      when: immediately ? Date.now() : undefined,
      periodInMinutes: state.notificationInterval
    });
  });
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handlers = {
    snooze: ({ minutes }) => {
      if (minutes <= state.maxSnoozeMinutes) {
        snoozeNotification(minutes);
      }
    },
    notification: ({ minutes }) => {
      if (minutes <= state.maxSnoozeMinutes) {
        state.notificationInterval = minutes;
        chrome.storage.local.set({ notificationInterval: minutes });
        setupAlarm();
      }
    },
    toggle: ({ isActive }) => {
      state.isActive = isActive;
      chrome.storage.local.set({ isActive });
      if (isActive) {
        setupAlarm(true);
      } else {
        chrome.alarms.clear('timeNotification');
      }
    },
    updateSound: ({ enabled }) => {
      state.soundEnabled = enabled;
      chrome.storage.local.set({ soundEnabled: enabled });
    }
  };

  const handler = handlers[request.action];
  if (handler) {
    handler(request);
  }
});

// Notification management
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'timeNotification') {
    checkAndShowNotification();
  }
});

function checkAndShowNotification() {
  if (!state.isActive) return;
  
  const now = Date.now();
  if (!state.nextNotificationTime || now >= state.nextNotificationTime) {
    showNotification();
  }
}

function formatTimeString(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function showNotification() {
  const notificationId = `time-${Date.now()}`;
  const timeString = formatTimeString();
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'images/clock-128.png',
    title: 'Time Check',
    message: `Current time is ${timeString}.\nNext notification in ${state.notificationInterval} minutes.`,
    buttons: state.defaultSnoozeOptions.map(minutes => ({
      title: `Snooze ${minutes} minutes`
    })),
    requireInteraction: false,
    silent: !state.soundEnabled,
    priority: 1
  });

  // Auto-clear notification
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, state.notificationDuration);
}

function snoozeNotification(minutes) {
  if (minutes > state.maxSnoozeMinutes) return;
  
  state.nextNotificationTime = Date.now() + (minutes * 60000);
  chrome.storage.local.set({ nextNotificationTime: state.nextNotificationTime });
  
  chrome.alarms.create('timeNotification', {
    when: state.nextNotificationTime
  });
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  chrome.notifications.clear(notificationId);
  const snoozeMinutes = state.defaultSnoozeOptions[buttonIndex];
  if (snoozeMinutes) {
    snoozeNotification(snoozeMinutes);
  }
});

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
});