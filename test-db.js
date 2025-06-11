const prisma = require('./src/config/prisma');

async function testConnection() {
  try {
    // Try to get a count of areas to test the connection
    const areaCount = await prisma.areaTable.count();
    console.log('Successfully connected to database!');
    console.log(`Number of areas in database: ${areaCount}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
