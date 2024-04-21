//activity-log.js
$(document).ready(function() {
    let dataTable = $('.table').DataTable({
        "paging": true,
        "ordering": true,
        "order": [[0, "desc"]], // Sort by the first column in descending order
        "info": true,
        "searching": true,
        "responsive": true,
        "pageLength": 25,
        "dom": 'Bfrtip',
        "buttons": [
            { extend: 'csvHtml5', text: '<i class="fas fa-file-csv"></i>', titleAttr: 'Export to CSV', className: 'btn btn-info btn-smaller' },
            { extend: 'excelHtml5', text: '<i class="fas fa-file-excel"></i>', titleAttr: 'Export to Excel', className: 'btn btn-success btn-smaller' },
            { extend: 'print', text: '<i class="fas fa-print"></i>', titleAttr: 'Print', className: 'btn btn-primary btn-smaller' }
        ],
        "initComplete": function(settings, json) {
            // Initialize Bootstrap tooltips
            $(this).find('[data-bs-toggle="tooltip"]').tooltip(); // You may need to adjust this selector depending on your HTML structure
            $('.spinner-overlay').hide();
        }
    });

     // Event handler for clicking on a message
    $('#logsTable tbody').on('click', '.message-cell', function() {
        const message = $(this).data('message');
        const date = $(this).closest('tr').find('td:first-child').text();
        const level = $(this).prev().text();
        $('#errorMessage').text(message);  // Insert message into modal
        $('.modal-title').text(`${level.toUpperCase()} - ${date}`); // Set modal title
        $('#messageModal').modal('show'); // Show the modal
    });

    // Initialize tooltips on dynamically added elements
    dataTable.buttons().container().find('.btn').attr('data-bs-toggle', 'tooltip').tooltip();

    // Set default sorting behavior
    dataTable.on('init.dt', function () {
        this.api().order([[0, 'desc']]).draw();
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const sortLinks = document.querySelectorAll('.sort-link');

    sortLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            disposeTooltips();

            const sortParam = this.dataset.sort;
            const sortOrder = this.dataset.order;
            const url = `/logs?sort_by=${sortParam}&order=${sortOrder}`;

            fetch(url, { headers: { 'Accept': 'application/json' } })
                .then(response => response.json())
                .then(data => {
                    updateTable(data.logs);
                    this.dataset.order = this.dataset.order === 'desc' ? 'asc' : 'desc';
                    initializeTooltips();
                })
                .catch(error => console.error('Error:', error));
        });
    });

    function updateTable(logs) {
        const tableBody = document.getElementById('logsTableBody');
        tableBody.innerHTML = '';

        logs.forEach(log => {
            const row = `
                <tr>
                    <td>${log.date}</td>
                    <td>${log.level}</td>
                    <td>${log.message}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
        initializeTooltips(); // Reinitialize tooltips after updating the table
    }

    function initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    function disposeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
            const tooltipInstance = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });
    }
});