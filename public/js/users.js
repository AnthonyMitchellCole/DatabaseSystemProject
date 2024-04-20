function confirmDelete(userId, userEmail) {
    if (confirm(`Are you sure you want to delete ${userEmail}?`)) {
        fetch('/users/' + userId, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                // alert(data.error);
                window.location.href = window.location.pathname + '?error=' + encodeURIComponent(data.error);
            } else {
                window.location.href = '/users?success=' + encodeURIComponent(`${userEmail} deleted successfully`);
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Network or parsing error occurred.');
        });
    }
}