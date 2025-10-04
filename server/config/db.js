const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/curesight');

    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/curesight', {
      // Modern Mongoose doesn't need these options, but keeping for compatibility
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📊 Database Host: ${conn.connection.host}`);
    console.log(`📋 Database Name: ${conn.connection.name}`);
    console.log(`⚡ Connection State: ${conn.connection.readyState}`); // 1 = connected

    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🔄 Shutting down gracefully...');
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });

    return conn;

  } catch (error) {
    console.error('❌ MongoDB Connection Failed:');
    console.error('Error details:', error.message);
    
    // More detailed error logging
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Solution: Make sure MongoDB is running');
      console.error('   - Windows: Run "mongod" in command prompt');
      console.error('   - Mac/Linux: Run "sudo systemctl start mongod"');
      console.error('   - Or start MongoDB service manually');
    }
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Solution: Check MongoDB connection string and server status');
    }

    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Ensure MongoDB is installed and running');
    console.error('2. Check connection string in .env file');
    console.error('3. Verify MongoDB is listening on port 27017');
    console.error('4. Check firewall settings if using remote MongoDB\n');
    
    process.exit(1);
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    // Test basic database operations
    const testDoc = await mongoose.connection.db.collection('test').insertOne({
      message: 'Connection test',
      timestamp: new Date()
    });
    
    console.log('✅ Database write test successful');
    
    // Clean up test document
    await mongoose.connection.db.collection('test').deleteOne({ _id: testDoc.insertedId });
    console.log('🧹 Test cleanup completed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
};

// Database health check
const checkDBHealth = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected', 
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  return {
    status: states[state] || 'Unknown',
    ready: state === 1,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
};

module.exports = {
  connectDB,
  testConnection,
  checkDBHealth
};
