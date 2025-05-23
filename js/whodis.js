export function showLoginModal() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('login-modal').style.display = 'block';
}
export function hideLoginModal() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('login-modal').style.display = 'none';
}
export function showApp() {
    document.getElementById('app-content').style.display = 'block';
}

// Dynamically load your main.js only once login is done
export function loadAppScript() {
    const s = document.createElement('script');
    s.type = 'module';
    s.src  = 'js/main.js';
    document.body.appendChild(s);
}

export function submitLogin() {
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
    loadAppScript();
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
    loadAppScript();
    } else {
    showLoginModal();
    }
});