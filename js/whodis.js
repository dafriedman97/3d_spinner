function showLoginModal() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('login-modal').style.display = 'block';
}
function hideLoginModal() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('login-modal').style.display = 'none';
}
function showApp() {
    document.getElementById('app-content').style.display = 'block';
}

// Dynamically load your main.js only once login is done
async function loadApp() {
  // Vite will see this literal import and bundle `main.js` + its deps
  await import('./main.js');
  // at this point `main.js` has run, and you can rely on its side-effects
}

function submitLogin() {
    const u = document.getElementById('username-input').value;
    const p = document.getElementById('password-input').value;

    if (u !== 'phil' || p !== '.lywooderice') {
    alert('Wrong credentials, please try again.');
    return;
    }

    // mark today as done
    localStorage.setItem('lastLoginDate', new Date().toISOString().slice(0,10));
    hideLoginModal();
    showApp();
    loadApp();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-submit-btn')
            .addEventListener('click', submitLogin);
    document.getElementById('password-input')
            .addEventListener('keyup', e => { if (e.key==='Enter') submitLogin(); });

    const today = new Date().toISOString().slice(0,10);
    if (localStorage.getItem('lastLoginDate') === today) {
    // already logged in, skip modal and boot app
    showApp();
    loadApp();
    } else {
    showLoginModal();
    }
});