//api-events.js
// document.addEventListener('DOMContentLoaded', function() {
//     const editor = new JSONEditor(document.getElementById('jsoneditor'), { mode: 'view' });

//     document.querySelectorAll('.view-details').forEach(button => {
//         button.addEventListener('click', function() {
//             const eventId = this.dataset.eventId;
//             fetch(`/api/events/details/${eventId}`)
//                 .then(response => {
//                     if (!response.ok) {
//                         throw new Error('Network response was not ok');
//                     }
//                     return response.json();
//                 })
//                 .then(data => {
//                     editor.set(data);
//                     $('#eventDetailsModal').modal('show');
//                 })
//                 .catch(error => {
//                     console.error('Failed to fetch event details:', error);
//                     alert('Failed to fetch event details: ' + error.message);
//                 });
//         });
//     });
// });

$(document).ready(function() {
    // Initialize the JSON editor first
    const editor = new JSONEditor(document.getElementById('jsoneditor'), { mode: 'view' });

    // Initialize the DataTable
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

    // Event handler for view details buttons
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const eventId = this.dataset.eventId;
            fetch(`/api/events/details/${eventId}`)
                .then(response => response.json())
                .then(data => {
                    editor.set(data);
                    $('#eventDetailsModal').modal('show');
                })
                .catch(error => {
                    console.error('Failed to fetch event details:', error);
                    alert('Failed to fetch event details: ' + error.message);
                });
        });
    });

    // Inside api-events.js or in a script block in api-events.ejs
    document.querySelectorAll('.view-full-details').forEach(button => {
        button.addEventListener('click', function() {
            const eventId = this.dataset.eventId;
            window.location.href = `/api/events/full-details/${eventId}`;  // Redirect to the details page
        });
    });

    // Initialize tooltips on dynamically added elements
    dataTable.buttons().container().find('.btn').attr('data-bs-toggle', 'tooltip').tooltip();
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