const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/curesight');
    
    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ adminLevel: 'super_admin' });
    if (existingAdmin) {
      console.log('Super admin already exists:', existingAdmin.email);
      return;
    }

    const superAdmin = new Admin({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@curesight.com',
      password: 'Admin123!@#', // Change this in production
      adminLevel: 'super_admin',
      permissions: [
        'verify_doctors', 'manage_users', 'view_analytics', 
        'manage_content', 'system_settings', 'support_tickets'
      ]
    });

    await superAdmin.save();
    console.log('✅ Super admin created successfully!');
    console.log('Email:', superAdmin.email);
    console.log('Password: Admin123!@#');
    console.log('⚠️ Please change the password after first login');
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    mongoose.disconnect();
  }
};

createSuperAdmin();
