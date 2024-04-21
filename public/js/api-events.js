//api-events.js
document.addEventListener('DOMContentLoaded', function() {
    const editor = new JSONEditor(document.getElementById('jsoneditor'), { mode: 'view' });

    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const eventId = this.dataset.eventId;
            fetch(`/api/events/details/${eventId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
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