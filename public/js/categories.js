function confirmDelete(categoryId, categoryName) {
    if (confirm(`Are you sure you want to delete ${categoryName}?`)) {
        fetch('/categories/' + categoryId, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => response.json()) // Always parse JSON to handle both success and error uniformly
        .then(data => {
            if (data.error) {
                // Handle any errors that come through
                console.error('Error:', data.error);
                //alert(data.error); // Optionally replace with a more user-friendly error display method
                // Update current page without changing URL to display the error
                window.location.href = window.location.pathname + '?error=' + encodeURIComponent(data.error);
            } else {
                // Redirect on successful deletion
                window.location.href = '/categories?success=' + encodeURIComponent(`${categoryName} deleted successfully`);
            }
        })
        .catch(err => {
            console.error('Error:', err);
            // Show error message in a user-friendly way
            alert('Network or parsing error occurred.');
        });
    }
}