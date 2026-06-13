const app = require('./app.js');
const { PORT } = require('./config/db.js');

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Server listening on: http://localhost:${PORT}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});
