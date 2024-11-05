let isActive = true;
let soundEnabled = false;
let nextNotificationTime = null;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize state
  chrome.storage.local.get(['isActive', 'soundEnabled', 'nextNotificationTime', 'notificationInterval'], function(result) {
    isActive = result.isActive !== undefined ? result.isActive : true;
    soundEnabled = result.soundEnabled || false;
    nextNotificationTime = result.nextNotificationTime || null;
    notificationInterval = result.notification || 3;
    
    updateToggleButton();
    updateSnoozeStatus();
    document.getElementById('soundToggle').checked = soundEnabled;
  });

  // Start timers
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  setInterval(updateSnoozeStatus, 1000);

  // Event listeners
  document.getElementById('snooze5').addEventListener('click', () => snooze(10));
  document.getElementById('snooze15').addEventListener('click', () => snooze(30));
  
  document.getElementById('customSnoozeBtn').addEventListener('click', () => {
    const container = document.getElementById('customSnoozeContainer');
    container.classList.toggle('visible');
  });

  document.getElementById('setCustomSnooze').addEventListener('click', () => {
    const minutes = parseInt(document.getElementById('customSnoozeMinutes').value);
    if (minutes && minutes > 0 && minutes <= 180) {
      snooze(minutes);
      document.getElementById('customSnoozeContainer').classList.remove('visible');
    }
  });

  document.getElementById('customNotificationBtn').addEventListener('click', () => {
    const container = document.getElementById('customNotificationContainer');
    container.classList.toggle('visible');
  });

  document.getElementById('setCustomNotification').addEventListener('click', () => {
    const minutes = parseInt(document.getElementById('customNotificationMinutes').value);
    if (minutes && minutes > 0 && minutes <= 180) {
      notification(minutes);
      document.getElementById('customNotificationContainer').classList.remove('visible');
    }
  });

  document.getElementById('soundToggle').addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    chrome.runtime.sendMessage({action: 'updateSound', enabled: soundEnabled});
  });

  document.getElementById('toggleNotifications').addEventListener('click', () => {
    isActive = !isActive;
    chrome.runtime.sendMessage({action: 'toggle', isActive});
    updateToggleButton();
  });
});

function updateCurrentTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  document.getElementById('currentTime').textContent = `Current time: ${timeString}`;
}

function updateSnoozeStatus() {
  const countdown = document.querySelector('.countdown');
  if (!isActive) {
    countdown.textContent = 'Paused';
    return;
  }
  
  chrome.storage.local.get(['nextNotificationTime'], function(result) {
    if (!result.nextNotificationTime) {
      countdown.textContent = 'Active';
      return;
    }
    
    const remaining = Math.max(0, result.nextNotificationTime - Date.now());
    if (remaining <= 0) {
      countdown.textContent = 'Active';
    } else {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      countdown.textContent = `${minutes}m ${seconds}s`;
    }
  });
}

function snooze(minutes) {
  chrome.runtime.sendMessage({
    action: 'snooze',
    minutes: minutes
  });
  window.close();
}

function notification(minutes) {
  chrome.runtime.sendMessage({
    action: 'notification',
    minutes: minutes
  });
  window.close();
}

function updateToggleButton() {
  const button = document.getElementById('toggleNotifications');
  button.innerHTML = `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    ${isActive ? 'Notifications Active' : 'Notifications Paused'}
  `;
  button.classList.toggle('paused', !isActive);
}