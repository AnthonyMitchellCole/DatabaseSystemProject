(function () {
    'use strict';
    var forms = document.querySelectorAll('.needs-validation');
    Array.prototype.slice.call(forms).forEach(function (form) {
        form.addEventListener('submit', function (event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
})();

window.onload = function() {
    var transactionDate = document.getElementById('transactionDate');
    if (transactionDate && !transactionDate.value) {
        var now = moment().format('YYYY-MM-DDTHH:mm');
            transactionDate.placeholder = now;
        }
    };