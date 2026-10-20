// Entry file for Hostinger. Starts the prebuilt Next.js standalone server in
// app/. Its runtime packages (next, react, react-dom) are installed into
// app/node_modules by the postinstall script in package.json.
// Listen on all interfaces; PORT comes from the host (defaults to 3000).
process.env.HOSTNAME = '0.0.0.0'
require('./app/dashboard/server.js')
