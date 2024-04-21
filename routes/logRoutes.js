// /routes/logRoutes.js
const express = require('express');
const router = express.Router();
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Date and time
const moment = require('moment-timezone');

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode, Activity } = require('../middleware/database');

// Admin logs route with added functionality to handle 'file' parameter and fetch list of files
router.get('/admin/logs', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    const userTimezone = req.cookies['timezone'] || 'UTC'; // Default to UTC if no timezone cookie
    try {
        // console.log('Fetching logs...', './logs');
        const logsDirectory = path.join('./logs');
        const files = await listLogFiles(logsDirectory, 'application'); // Fetch the list of log files
        
        // Determine the file to fetch logs from
        let logFile;
        if (req.query.file) {
            // Validate if the file exists
            const fileExists = files.includes(req.query.file);
            if (!fileExists) {
                throw new Error('Requested log file does not exist');
            }
            logFile = path.join(logsDirectory, req.query.file);
        } else {
            // Find most recent log file
            const mostRecentLogFile = await findMostRecentLogFile(logsDirectory, 'application', moment().tz(userTimezone).format('YYYY-MM-DD'));
            if (!mostRecentLogFile) {
                throw new Error('No log files found.');
            }
            logFile = mostRecentLogFile;
        }

        const logs = await getLogsFromFile(logFile); // Using the correct function to read logs from the specified file

        // Check the Accept header to respond accordingly
        if (req.accepts('html')) {
            res.render('layout', {
                title: 'Application Logs',
                body: 'logs',
                user: req.user,
                logs: logs,
                files: files, // Pass the list of log files to the template
                activePage: 'adminLogs',
                moment: moment  // Passing moment to format dates in the view
            });
        } else {
            res.json({ logs });
        }
    } catch (err) {
        console.error('Failed to fetch logs:', err);
        if (req.accepts('html')) {
            let backURL = req.header('Referer') || '/';
            let parsedUrl = new URL(backURL, `http://${req.headers.host}`);
            parsedUrl.searchParams.set('error', 'Failed to retrieve logs.');
            res.redirect(parsedUrl.href);
        } else {
            res.status(500).json({ error: 'Failed to retrieve logs', details: err.message });
        }
    }
});

// Admin error logs route
router.get('/admin/error-logs', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    const userTimezone = req.cookies['timezone'] || 'UTC'; // Default to UTC if no timezone cookie
    try {
        // console.log('Fetching logs...', './logs');
        const logsDirectory = path.join('./logs');
        const files = await listLogFiles(logsDirectory, 'exceptions'); // Fetch the list of log files
        
        // Determine the file to fetch logs from
        let logFile;
        if (req.query.file) {
            // Validate if the file exists
            const fileExists = files.includes(req.query.file);
            if (!fileExists) {
                throw new Error('Requested error log file does not exist');
            }
            logFile = path.join(logsDirectory, req.query.file);
        } else {
            // Find most recent log file
            const mostRecentLogFile = await findMostRecentLogFile(logsDirectory, 'exceptions');
            if (!mostRecentLogFile) {
                throw new Error('No error log files found.');
            }
            logFile = mostRecentLogFile;
        }

        const logs = await getExceptionLogsFromFile(logFile); // Using the correct function to read logs from the specified file

        // Check the Accept header to respond accordingly
        if (req.accepts('html')) {
            res.render('layout', {
                title: 'Exception Logs',
                body: 'error-logs',
                user: req.user,
                logs: logs,
                files: files, // Pass the list of log files to the template
                activePage: 'adminLogs',
                moment: moment  // Passing moment to format dates in the view
            });
        } else {
            res.json({ logs });
        }
    } catch (err) {
        console.error('Failed to fetch error logs:', err);
        if (req.accepts('html')) {
            let backURL = req.header('Referer') || '/';
            let parsedUrl = new URL(backURL, `http://${req.headers.host}`);
            parsedUrl.searchParams.set('error', 'Failed to retrieve error logs.');
            res.redirect(parsedUrl.href);
        } else {
            res.status(500).json({ error: 'Failed to retrieve error logs', details: err.message });
        }
    }
});

// GET route to fetch and display activity logs with response type based on Accept header
router.get('/admin/activity-logs', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    console.log('Fetching activity logs...');
    try {
        const logs = await Activity.find().sort({ timestamp: -1 });
        // console.log('Activity logs:');

        // Check the Accept header to respond accordingly
        if (req.accepts('html')) {
            // console.log('Rendering activity logs page...');
            try {
                res.render('layout', {
                    title: 'Activity Logs',
                    body: 'activity-logs',
                    user: req.user,
                    logs: logs,
                    moment: moment,  // Passing moment to format dates in the view
                    activePage: 'adminLogs'
                });
            } catch (err) {
                console.error('Error rendering activity logs:', err);
                res.status(500).render('error', { error: 'Failed to load activity logs.', user: req.user });
            }
        } else {
            res.json({ logs });
        }
    } catch (err) {
        console.error('Failed to fetch activity logs:', err);
        if (req.accepts('html')) {
            let backURL = req.header('Referer') || '/';
            let parsedUrl = new URL(backURL, `http://${req.headers.host}`);
            parsedUrl.searchParams.set('error', 'Failed to retrieve activity logs.');
            res.redirect(parsedUrl.href);
        } else {
            res.status(500).json({ error: 'Failed to retrieve activity logs', details: err.message });
        }
    }
});

//------------------LOG FILE FUNCTIONS---------------//

async function ensureLogDirectoryExists(directory) {
    try {
        await fs.promises.access(directory);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.promises.mkdir(directory, { recursive: true });
        } else {
            throw error;
        }
    }
}

async function findMostRecentLogFile(directory, baseName, dateStr) {
    const files = await fs.promises.readdir(directory);
    // Filter files that match the base log file pattern and sort by date, descending
    const sortedFiles = files
        .filter(file => file.startsWith(baseName) && file.endsWith('.log'))
        .sort((a, b) => b.localeCompare(a)); // Latest date first

    // Find the first log file on or before the given date
    const mostRecentFile = sortedFiles.find(file => file <= dateStr != undefined ? `${baseName}-${dateStr}.log` : `${baseName}.log`);
    return mostRecentFile ? path.join(directory, mostRecentFile) : null;
}

async function listLogFiles(directory, baseName) {
    try {
        const files = await fs.promises.readdir(directory);
        // Filter files that match the base log file pattern and sort by date, descending
        return files.filter(file => file.startsWith(baseName) && file.endsWith('.log'))
                    .sort((a, b) => b.localeCompare(a));
    } catch (error) {
        console.error('Failed to list log files:', error);
        throw error;
    }
}

// Helper function to get logs from a file path
async function getLogsFromFile(logFilePath) {
    try {
        const data = await fs.promises.readFile(logFilePath, 'utf8');
        const logEntries = data.split('\n').filter(line => line).map(JSON.parse);
        return logEntries.map(entry => {
            const messageParts = /(\S+) - - \[([^\]]+)\] "(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD) (\S+) HTTP\/\d.\d" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/.exec(entry.message);
            return messageParts ? {
                timestamp: entry.timestamp,
                level: entry.level,
                clientIp: messageParts[1],
                rfc1413: '-',
                userid: '-',
                logTimestamp: messageParts[2],
                method: messageParts[3],
                path: messageParts[4],
                statusCode: messageParts[5],
                size: messageParts[6] === '-' ? '0' : messageParts[6],
                referer: messageParts[7] === '-' ? 'No referer' : messageParts[7],
                userAgent: messageParts[8],
                service: entry.service
            } : null;
        }).filter(entry => entry !== null);
    } catch (error) {
        console.error('Error reading log file:', error);
        throw error;
    }
}

// Helper function to get exception logs from a file path
async function getExceptionLogsFromFile(logFilePath) {
    try {
        const data = await fs.promises.readFile(logFilePath, 'utf8');
        const logEntries = data.split('\n').filter(line => line).map(JSON.parse);
        return logEntries.map(entry => {
            const messageParts = { timestamp: entry.timestamp, level: entry.level, message: entry.message};
            return messageParts ? {
                timestamp: entry.timestamp,
                level: entry.level,
                message: entry.message,
            } : null;
        }).filter(entry => entry !== null);
    } catch (error) {
        console.error('Error reading log file:', error);
        throw error;
    }
}

async function getLogs(timezone = 'UTC') {
    const dateStr = moment().tz(timezone).format('YYYY-MM-DD');
    const logsDirectory = path.join(__dirname, 'logs');
    await ensureLogDirectoryExists(logsDirectory);

    const logFilePath = await findMostRecentLogFile(logsDirectory, 'application', dateStr);

    if (!logFilePath) {
        console.error('No log files found.');
        return [];
    }

    try {
        const data = await fs.promises.readFile(logFilePath, 'utf8');
        const logEntries = data.split('\n').filter(line => line).map(JSON.parse);

        return logEntries.map(entry => {
            const messageParts = /(\S+) - - \[([^\]]+)\] "(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD) (\S+) HTTP\/\d.\d" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/.exec(entry.message);
            if (messageParts) {
                return {
                    timestamp: entry.timestamp,
                    level: entry.level,
                    clientIp: messageParts[1],
                    rfc1413: '-',
                    userid: '-',
                    logTimestamp: messageParts[2],
                    method: messageParts[3],
                    path: messageParts[4],
                    statusCode: messageParts[5],
                    size: messageParts[6] === '-' ? '0' : messageParts[6],
                    referer: messageParts[7] === '-' ? 'No referer' : messageParts[7],
                    userAgent: messageParts[8],
                    service: entry.service
                };
            }
            return null;
        }).filter(entry => entry !== null);
    } catch (error) {
        console.error('Error reading log file:', error);
        throw error;
    }
}

//------------------------------------------------//

module.exports = router;