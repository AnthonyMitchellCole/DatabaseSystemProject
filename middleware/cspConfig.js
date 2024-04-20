//cspConfig.js
const crypto = require('crypto');

// Helper function to generate SHA-256 hash
function getScriptHash(scriptText) {
    const hash = crypto.createHash('sha256');
    hash.update(scriptText);
    return `'sha256-${hash.digest('base64')}'`;
}

// -------- Inline scripts -------- //

//index.ejs
// const inlineScript1 = `var productData = JSON.parse(unescape('<%= JSON.stringify(productData) %>'));`;


// const inlineScript2 = ``;

// //add-record.ejs
// const inlineScript3 = ``;

// //categories.ejs
// const inlineScript4 = ``;

// //edit-profile.ejs
// const inlineScript5 = ``;

// //login.ejs
// const inlineScript6 = ``;

// //logs.ejs
// const inlineScript7 = ``;

// //products.ejs
// const inlineScript8 = ``;

// //register.ejs
// const inlineScript9 = ``;

// //transactions.ejs
// const inlineScript10 = ``;

// //users.ejs
// const inlineScript11 = ``;

// -------- ------------- -------- //

// Hashes for the inline scripts
// const inlineScriptHash1 = getScriptHash(inlineScript1);
// const inlineScriptHash2 = getScriptHash(inlineScript2);
// const inlineScriptHash3 = getScriptHash(inlineScript3);
// const inlineScriptHash4 = getScriptHash(inlineScript4);
// const inlineScriptHash5 = getScriptHash(inlineScript5);
// const inlineScriptHash6 = getScriptHash(inlineScript6);
// const inlineScriptHash7 = getScriptHash(inlineScript7);
// const inlineScriptHash8 = getScriptHash(inlineScript8);
// const inlineScriptHash9 = getScriptHash(inlineScript9);
// const inlineScriptHash10 = getScriptHash(inlineScript10);
// const inlineScriptHash11 = getScriptHash(inlineScript11);

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
        (req, res) => `'nonce-${res.locals.nonce}'`,  // Allow scripts from the same origin and inline scripts via nonce
            // "'unsafe-inline'", 
            "https://cdn.jsdelivr.net", 
            "https://apis.google.com", 
            "https://cdn.datatables.net", 
            "https://code.jquery.com", 
            "https://cdnjs.cloudflare.com"
        ],  // Allows scripts from Google APIs and other CDNs
        scriptSrcAttr: ["'self'"],  // Disallows inline script and event-handling HTML attributes
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', 'https://cdn.datatables.net'],  // Allow styles from Google and inline styles
        upgradeInsecureRequests: [],  // Upgrades HTTP requests to HTTPS on supported browsers
    },
};

module.exports = cspConfig;