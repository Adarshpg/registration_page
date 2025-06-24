const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Successfully connected to MongoDB');
    
    // Get the database connection
    const db = mongoose.connection.db;
    
    // List all collections in the database
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));
    
    // If we have a registrations collection, show the first few documents
    if (collections.some(c => c.name === 'registrations')) {
      const registrations = await db.collection('registrations').find({}).limit(5).toArray();
      console.log('Sample registrations:', JSON.stringify(registrations, null, 2));
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('Error testing MongoDB connection:', error);
    process.exit(1);
  }
}

testConnection();
