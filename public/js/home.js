//home.js

// console.log(typeof productData); // Should output 'object'
// console.log(productData); // Should display the parsed data structure


function getRandomColor() {
    var r = Math.floor(Math.random() * 256); // Red value 0-255
    var g = Math.floor(Math.random() * 256); // Green value 0-255
    var b = Math.floor(Math.random() * 256); // Blue value 0-255
    return `rgba(${r}, ${g}, ${b}, 0.2)`; // Return RGBA color string
}

var ctx = document.getElementById('inventoryChart').getContext('2d');


var backgroundColors = productData.map(() => getRandomColor()); // Generate a background color for each product
var borderColors = backgroundColors.map(color => color.replace('0.2', '1')); // Use the same color but with full opacity for borders

var inventoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: productData.map(product => product.name),
        datasets: [{
            label: 'Inventory Levels',
            data: productData.map(product => product.quantity),
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        plugins: {
            legend: {
                display: false // Proper way to hide legend in newer versions of Chart.js
            }
        }
    }
});