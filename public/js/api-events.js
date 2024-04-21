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

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the JSON editor first
    const editor = new JSONEditor(document.getElementById('jsoneditor'), { mode: 'view' });

    // Initialize the DataTable
    let dataTable = $('#eventsTable').DataTable({
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
});
