// Theme Toggle Functionality
(function() {
    const landingSplash = document.querySelector('.landing-splash');
    const appContainer = document.querySelector('.app-container');
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';

    if (landingSplash && appContainer) {
        const lastVisitDate = localStorage.getItem('lastVisitDate');
        const current_day = new Date().toDateString();
        
        if (lastVisitDate === current_day) {
            landingSplash.style.display = 'none';
            appContainer.style.opacity = '1';
        } else {
            setTimeout(() => {
                localStorage.setItem('lastVisitDate', current_day);
            }, 4000);
        }
    }
    
    // Apply theme on page load
    document.body.setAttribute('data-theme', currentTheme);
    
    // Toggle theme on button click
    if(themeToggle){
        themeToggle.addEventListener('click', () => {
            const theme = document.body.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
        }
    });
})();




