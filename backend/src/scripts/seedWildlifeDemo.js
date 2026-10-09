require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { seedWildlifeData } = require('../services/wildlife/simulation');

async function ensureUser({ name, email, role }) {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 6) {
    throw new Error('Set DEMO_PASSWORD in backend/.env before seeding demo users. Do not commit that file.');
  }
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, password, role, phone: '0000000000' });
    console.log(`Created ${role} ${email}`);
  } else {
    console.log(`Reused ${role} ${email}`);
  }
  return user;
}

async function main() {
  await connectDB();
  const manager = await ensureUser({
    name: 'Park Manager Demo',
    email: 'manager.demo@wildpulse.local',
    role: 'PARK_MANAGER',
  });
  const ranger = await ensureUser({
    name: 'Yala Ranger Demo',
    email: 'ranger.demo@wildpulse.local',
    role: 'RANGER',
  });
  const farRanger = await ensureUser({
    name: 'Standby Ranger Demo',
    email: 'ranger.far.demo@wildpulse.local',
    role: 'RANGER',
  });
  const result = await seedWildlifeData({
    managerId: manager._id,
    rangerId: ranger._id,
    farRangerId: farRanger._id,
  });
  console.log('Wildlife demo data ready', result);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
