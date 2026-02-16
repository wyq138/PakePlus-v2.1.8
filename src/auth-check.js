document.addEventListener('DOMContentLoaded', async function() {
    if (window.location.pathname.includes('login.html')) {
        return;
    }
    
    const user = localStorage.getItem('animal_hospital_current_user');
    
    if (!user) {
        window.location.href = 'login.html';
    }
});
