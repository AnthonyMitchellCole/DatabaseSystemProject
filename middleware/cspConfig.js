//cspConfig.js
const crypto = require('crypto');

// Helper function to generate SHA-256 hash
function getScriptHash(scriptText) {
    const hash = crypto.createHash('sha256');
    hash.update(scriptText);
    return `'sha256-${hash.digest('base64')}'`;
}

// -------- Inline scripts -------- //

//layout.ejs
const inlineScript1 = ` var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
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
                            document.cookie = \`timezone=\${timezone};path=/;expires=\${new Date(Date.now() + 86400000).toUTCString()}\`; // Set for 1 day
                        });`;

//index.ejs
const inlineScript2 = `  function getRandomColor() {
                            var r = Math.floor(Math.random() * 256); // Red value 0-255
                            var g = Math.floor(Math.random() * 256); // Green value 0-255
                            var b = Math.floor(Math.random() * 256); // Blue value 0-255
                            return \`rgba(\${r}, \${g}, \${b}, 0.2)\`; // Return RGBA color string
                        }

                        var ctx = document.getElementById('inventoryChart').getContext('2d');
                        var productData = JSON.parse(unescape('<%= productData %>')); // Unescape and parse the JSON data

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
                        });`;

//add-record.ejs
const inlineScript3 = ``;

//categories.ejs
const inlineScript4 = ``;

//edit-profile.ejs
const inlineScript5 = ``;

//login.ejs
const inlineScript6 = ``;

//logs.ejs
const inlineScript7 = ``;

//products.ejs
const inlineScript8 = ``;

//register.ejs
const inlineScript9 = ``;

//transactions.ejs
const inlineScript10 = ``;

//users.ejs
const inlineScript11 = ``;

// -------- ------------- -------- //

// Hashes for the inline scripts
const inlineScriptHash1 = getScriptHash(inlineScript1);
const inlineScriptHash2 = getScriptHash(inlineScript2);
const inlineScriptHash3 = getScriptHash(inlineScript3);
const inlineScriptHash4 = getScriptHash(inlineScript4);
const inlineScriptHash5 = getScriptHash(inlineScript5);
const inlineScriptHash6 = getScriptHash(inlineScript6);
const inlineScriptHash7 = getScriptHash(inlineScript7);
const inlineScriptHash8 = getScriptHash(inlineScript8);
const inlineScriptHash9 = getScriptHash(inlineScript9);
const inlineScriptHash10 = getScriptHash(inlineScript10);
const inlineScriptHash11 = getScriptHash(inlineScript11);

// CSP configuration
const cspConfig = {
    directives: {
        defaultSrc: ["'self'"],  // Default policy for loading content such as JavaScript, Images, CSS, Fonts, AJAX requests, Frames, HTML5 Media
        baseUri: ["'self'"],  // Restrict the base element which can prevent attacks caused by injecting links to malicious sites.
        blockAllMixedContent: [],  // Prevent loading any assets using HTTP when the page is loaded using HTTPS
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],  // Fonts loaded from Google Fonts and self
        frameAncestors: ["'self'"],  // Specifies valid parents that may embed a page
        imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],  // Allow images from the same origin, data URLs, and specific domains
        objectSrc: ["'none'"],  // Prevents object, embed, and applet elements from loading external resources
        scriptSrc: ["'self'",
            "'unsafe-inline'", 
            "https://cdn.jsdelivr.net", 
            "https://apis.google.com", 
            "https://cdn.datatables.net", 
            "https://code.jquery.com", 
            "https://cdnjs.cloudflare.com"
        ],  // Allows scripts from Google APIs and other CDNs
        scriptSrcAttr: ["'none'"],  // Disallows inline script and event-handling HTML attributes
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', 'https://cdn.datatables.net'],  // Allow styles from Google and inline styles
        upgradeInsecureRequests: [],  // Upgrades HTTP requests to HTTPS on supported browsers
    },
};

module.exports = cspConfig;