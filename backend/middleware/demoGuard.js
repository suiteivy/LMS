const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const DEMO_WRITE_WHITELIST = [
    '/api/auth/signout',
    '/api/demo/end',
];

module.exports = function demoGuard(req, res, next) {
    if (!req.isDemo) return next();
    if (DEMO_WRITE_WHITELIST.some(path => req.path.includes(path))) return next();

    if (WRITE_METHODS.includes(req.method)) {
        return res.status(200).json({
            success: true,
            demo: true,
            message: 'Demo mode — changes are not saved.'
        });
    }

    next();
};