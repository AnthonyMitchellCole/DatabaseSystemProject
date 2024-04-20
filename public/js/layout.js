//layout.js

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});

$(document).ready(function() {
    $('select').select2({
        theme: 'bootstrap4'
    });

    $('#footerYear').text = new Date().getFullYear();
});

document.addEventListener('DOMContentLoaded', function () {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.cookie = `timezone=${timezone};path=/;expires=${new Date(Date.now() + 86400000).toUTCString()}`; // Set for 1 day
});