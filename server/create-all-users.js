const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Department = require('./models/Department');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartleave')
.then(async () => {
  console.log('Connected to MongoDB');

  // Create a default department first
  let department = await Department.findOne({});
  if (!department) {
    department = new Department({
      name: 'General Administration',
      code: 'GEN-ADM',
      description: 'General Administration Department'
    });
    await department.save();
    console.log('✅ Created department:', department.name);
  }

  const users = [
    {
      user_id: 'EMP001',
      first_name: 'Juan',
      last_name: 'Employee',
      email: 'employee@smartleave.com',
      position: 'Staff',
      password: 'password123',
      user_type: 'employee',
      department_id: department._id
    },
    {
      user_id: 'DA001',
      first_name: 'Maria',
      last_name: 'Department Admin',
      email: 'deptadmin@smartleave.com',
      position: 'Department Head',
      password: 'password123',
      user_type: 'department_admin',
      department_id: department._id
    },
    {
      user_id: 'HR001',
      first_name: 'Carlos',
      last_name: 'HR Manager',
      email: 'hr@smartleave.com',
      position: 'HR Manager',
      password: 'password123',
      user_type: 'hr',
      department_id: department._id
    },
    {
      user_id: 'MA001',
      first_name: 'Mayor',
      last_name: 'City Head',
      email: 'mayor@smartleave.com',
      position: 'City Mayor',
      password: 'password123',
      user_type: 'mayor',
      department_id: department._id
    }
  ];

  for (const userData of users) {
    const existingUser = await User.findOne({ user_id: userData.user_id });
    if (existingUser) {
      console.log(`⏭️  User ${userData.user_id} already exists, skipping`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = new User({
      ...userData,
      password: hashedPassword
    });
    await user.save();
    console.log(`✅ Created ${userData.user_type}: ${userData.user_id} (${userData.first_name} ${userData.last_name})`);
  }

  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Employee:          EMP001      | Password: password123');
  console.log('Department Admin:  DA001       | Password: password123');
  console.log('HR Manager:        HR001       | Password: password123');
  console.log('Mayor:             MA001       | Password: password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  mongoose.connection.close();
})
.catch((error) => {
  console.error('Error:', error);
});
