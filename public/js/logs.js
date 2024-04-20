$(document).ready(function() {
    let dataTable = $('.table').DataTable({
        "paging": true,
        "ordering": true,
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

    // Initialize tooltips on dynamically added elements
    dataTable.buttons().container().find('.btn').attr('data-bs-toggle', 'tooltip').tooltip();

    // Handle log file selection change
    $('#logFileSelector').change(function() {
        $('.spinner-overlay').show();
        const selectedFile = $(this).val();
        fetch(`/admin/logs?file=${encodeURIComponent(selectedFile)}`, {
            headers: {
                'Accept': 'application/json'
            }
        }).then(response => {
            // console.log(response);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // Ensure that the response is JSON before parsing
            })
            .then(data => {
                dataTable.clear();
                data.logs.forEach(log => {
                    dataTable.row.add([
                        log.timestamp,
                        log.level,
                        log.clientIp,
                        log.userid,
                        log.logTimestamp,
                        log.method,
                        log.path,
                        log.statusCode,
                        log.size,
                        log.referer,
                        log.userAgent
                    ]).draw();
                });
                $('.spinner-overlay').hide();
            })
            .catch(error => {
                console.error('Failed to fetch logs:', error);
                alert('Failed to load logs: ' + error.message);
            });
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
                    this.dataset.order = this.dataset.order === 'asc' ? 'desc' : 'asc';
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