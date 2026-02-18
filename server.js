// ============================================
// PRIME HOSPITAL - ADVANCED BACKEND SYSTEM
// PLUS CODE: CX7Q+8WF, SECTOR 36, GURUGRAM
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ============ SECURITY MIDDLEWARE ============
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// ============ DATABASE CONNECTION ============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/primehospital';

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log('📍 Hospital Plus Code: CX7Q+8WF');
})
.catch(err => {
    console.log('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
});

// ============ DATABASE SCHEMAS ============

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['patient', 'admin'], default: 'patient' },
    emergencyContact: {
        name: String,
        phone: String,
        relation: String
    },
    plusCode: { type: String, default: 'CX7Q+8WF' },
    createdAt: { type: Date, default: Date.now }
});

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    department: { type: String, required: true },
    appointmentDate: { type: Date, required: true },
    symptoms: [String],
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    queueNumber: Number,
    plusCode: { type: String, default: 'CX7Q+8WF' },
    location: { type: String, default: 'Khandsa Road, Sector 36, Haryana 122004' },
    createdAt: { type: Date, default: Date.now }
});

// Doctor Schema
const doctorSchema = new mongoose.Schema({
    name: String,
    specialization: [String],
    qualifications: [String],
    experience: Number,
    availability: [{
        day: String,
        slots: [String]
    }],
    consultationFee: Number,
    rating: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true }
});

// Bed Schema
const bedSchema = new mongoose.Schema({
    bedNumber: String,
    type: { type: String, enum: ['general', 'icu', 'private', 'emergency'] },
    department: String,
    isOccupied: { type: Boolean, default: false },
    pricePerDay: Number,
    plusCode: { type: String, default: 'CX7Q+8WF' }
});

const User = mongoose.model('User', userSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Bed = mongoose.model('Bed', bedSchema);

// ============ SEED INITIAL DATA ============
async function seedInitialData() {
    try {
        // Check if doctors exist
        const doctorCount = await Doctor.countDocuments();
        if (doctorCount === 0) {
            const doctors = [
                {
                    name: "Dr. Rajesh Sharma",
                    specialization: ["Cardiology"],
                    qualifications: ["MBBS", "MD", "DM Cardiology"],
                    experience: 15,
                    availability: [
                        { day: "Monday", slots: ["10:00", "11:00", "12:00"] },
                        { day: "Wednesday", slots: ["10:00", "11:00", "12:00"] },
                        { day: "Friday", slots: ["10:00", "11:00", "12:00"] }
                    ],
                    consultationFee: 1000,
                    rating: 4.8
                },
                {
                    name: "Dr. Priya Patel",
                    specialization: ["Neurology"],
                    qualifications: ["MBBS", "MD", "DM Neurology"],
                    experience: 12,
                    availability: [
                        { day: "Tuesday", slots: ["11:00", "12:00", "15:00"] },
                        { day: "Thursday", slots: ["11:00", "12:00", "15:00"] },
                        { day: "Saturday", slots: ["11:00", "12:00"] }
                    ],
                    consultationFee: 1200,
                    rating: 4.9
                }
            ];
            await Doctor.insertMany(doctors);
            console.log('✅ Sample doctors added');
        }

        // Check if beds exist
        const bedCount = await Bed.countDocuments();
        if (bedCount === 0) {
            const beds = [];
            // Add 50 beds
            for (let i = 1; i <= 50; i++) {
                let type = 'general';
                let price = 2000;
                if (i <= 10) { type = 'icu'; price = 5000; }
                else if (i <= 20) { type = 'private'; price = 3500; }
                
                beds.push({
                    bedNumber: `BED-${String(i).padStart(3, '0')}`,
                    type,
                    department: 'General',
                    isOccupied: false,
                    pricePerDay: price,
                    plusCode: 'CX7Q+8WF'
                });
            }
            await Bed.insertMany(beds);
            console.log('✅ Sample beds added');
        }
    } catch (error) {
        console.log('Seed data error:', error.message);
    }
}

// Call seed function after connection
mongoose.connection.once('open', seedInitialData);

// ============ API ROUTES ============

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        hospital: 'Prime Hospital',
        plusCode: 'CX7Q+8WF',
        address: 'Khandsa Road, Sector 36, Haryana 122004'
    });
});

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            phone,
            plusCode: 'CX7Q+8WF'
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                plusCode: user.plusCode
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                plusCode: user.plusCode
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Doctors
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find({ isAvailable: true });
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Available Beds
app.get('/api/beds', async (req, res) => {
    try {
        const beds = await Bed.find({ isOccupied: false });
        const stats = {
            total: await Bed.countDocuments(),
            available: beds.length,
            general: beds.filter(b => b.type === 'general').length,
            icu: beds.filter(b => b.type === 'icu').length,
            private: beds.filter(b => b.type === 'private').length,
            plusCode: 'CX7Q+8WF'
        };
        res.json({ beds: beds.slice(0, 10), stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Book Appointment
app.post('/api/appointments', async (req, res) => {
    try {
        const { patientName, patientPhone, department, appointmentDate, symptoms } = req.body;

        // Get today's appointment count for queue number
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayAppointments = await Appointment.countDocuments({
            appointmentDate: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        const appointment = new Appointment({
            patientName,
            patientPhone,
            department,
            appointmentDate,
            symptoms: symptoms || [],
            queueNumber: todayAppointments + 1,
            plusCode: 'CX7Q+8WF',
            location: 'Khandsa Road, Sector 36, Haryana 122004'
        });

        await appointment.save();

        res.status(201).json({
            message: 'Appointment booked successfully',
            appointment: {
                id: appointment._id,
                patientName: appointment.patientName,
                queueNumber: appointment.queueNumber,
                appointmentDate: appointment.appointmentDate,
                plusCode: appointment.plusCode,
                location: appointment.location
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Today's Appointments
app.get('/api/appointments/today', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const appointments = await Appointment.find({
            appointmentDate: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        }).sort({ queueNumber: 1 });

        res.json(appointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Appointments
app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Hospital Stats
app.get('/api/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = {
            todayAppointments: await Appointment.countDocuments({
                appointmentDate: { $gte: today }
            }),
            totalBeds: await Bed.countDocuments(),
            availableBeds: await Bed.countDocuments({ isOccupied: false }),
            totalDoctors: await Doctor.countDocuments({ isAvailable: true }),
            plusCode: 'CX7Q+8WF',
            address: 'Khandsa Road, Sector 36, Haryana 122004'
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Symptom Checker (Simple version)
app.post('/api/symptom-checker', async (req, res) => {
    try {
        const { symptoms } = req.body;

        const symptomMap = {
            'fever': ['Viral Fever', 'Flu', 'COVID-19'],
            'cough': ['Bronchitis', 'Common Cold', 'Asthma'],
            'headache': ['Migraine', 'Tension Headache', 'Sinusitis'],
            'chest pain': ['Angina', 'Acid Reflux', 'Muscle Strain'],
            'fatigue': ['Anemia', 'Thyroid', 'Diabetes'],
            'shortness of breath': ['Asthma', 'COPD', 'Heart Problem']
        };

        const possibleConditions = [];
        symptoms.forEach(symptom => {
            if (symptomMap[symptom.toLowerCase()]) {
                possibleConditions.push(...symptomMap[symptom.toLowerCase()]);
            }
        });

        // Remove duplicates
        const uniqueConditions = [...new Set(possibleConditions)];

        // Recommend department
        let department = 'General Medicine';
        if (symptoms.includes('chest pain')) department = 'Cardiology';
        if (symptoms.includes('headache')) department = 'Neurology';
        if (symptoms.includes('fever')) department = 'General Medicine';

        res.json({
            possibleConditions: uniqueConditions.slice(0, 5),
            recommendedDepartment: department,
            plusCode: 'CX7Q+8WF',
            disclaimer: 'This is a preliminary analysis. Please consult a doctor.'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FRONTEND ROUTE ============
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 PRIME HOSPITAL SERVER RUNNING');
    console.log('=================================');
    console.log(`📍 PORT: http://localhost:${PORT}`);
    console.log(`📍 Plus Code: CX7Q+8WF`);
    console.log(`📍 Address: Khandsa Road, Sector 36`);
    console.log(`📍 Haryana - 122004`);
    console.log('=================================\n');
});
