const tf = require('@tensorflow/tfjs-node');
const { uploadToGCS, deleteFromGCS } = require('../services/gcsService');
const pool = require('../utils/database');
const crypto = require('crypto');
const moment = require('moment-timezone');

// Fungsi untuk mendapatkan diagnosis pasien
const getPredict = async (request, h) => {
    try {
        const patientId = request.auth.credentials.id; // Extract patient ID from JWT

        const [diagnoses] = await pool.query(
            `SELECT Diagnosis_id, Id_patient, Img_disease, Disease_name, Description, Diagnosis_date, Model_version 
             FROM Diagnose 
             WHERE Id_patient = ?`,
            [patientId]
        );

        if (diagnoses.length === 0) {
            return h.response({ message: 'No diagnoses found for this patient.' }).code(404);
        }

        return h.response(diagnoses).code(200);
    } catch (error) {
        console.error('GET /predict Error:', error.message);
        return h.response({ message: 'Internal Server Error' }).code(500);
    }
};

// Fungsi untuk memuat model TensorFlow
let model;
const loadModel = async () => {
    if (!model) {
        try {
            const modelPath = './modelku/model.json'; // Path ke model TensorFlow
            model = await tf.loadGraphModel(`file://${modelPath}`);
        } catch (error) {
            console.error('Failed to load model:', error.message);
            throw new Error('Model loading error');
        }
    }
};

const predictDisease = async (request, h) => {
    
    const id_patient = request.auth.credentials.id; // ID pasien dari token JWT
    const img_disease = request.file; // File yang diunggah

    if (!img_disease) {
        return h.response({ message: 'Image file is required.' }).code(400);
    }

    try {
        // Validasi file tipe gambar
        const allowedMimeTypes = ['image/jpeg', 'image/png'];
        if (!allowedMimeTypes.includes(img_disease.mimetype)) {
            return h.response({ message: 'Invalid image format. Only JPEG and PNG are allowed.' }).code(400);
        }

        await loadModel(); // Memastikan model dimuat

        // Preprocessing gambar
        const tensor = tf.node
            .decodeImage(img_disease.buffer, 3)
            .resizeNearestNeighbor([224, 224])
            .expandDims(0)
            .toFloat()
            .div(tf.scalar(255));

        // Prediksi menggunakan model
        const prediction = model.predict(tensor);
        const scores = Array.from(await prediction.data());
        const labels = ['Caries', 'Gingivitis', 'Mouth Ulcer', 'Random', 'Tooth Discoloration'];
        const maxScoreIndex = scores.indexOf(Math.max(...scores));
        const confidence = scores[maxScoreIndex];
        const disease_name = labels[maxScoreIndex];

        // Jika hasil adalah "Random", gambar tidak diproses lebih lanjut
        if (disease_name === 'Random') {
            return h.response({
                message: 'Model tidak dapat menganalisis. Harap unggah gambar lainnya.',
            }).code(400);
        }

        const description = `Diagnosis menunjukkan ${disease_name} dengan tingkat kepercayaan ${(confidence * 100).toFixed(2)}%.`;
        const model_version = 'v1.1';

        //Me Generate nama file unik
        const randomString = crypto.randomBytes(2).toString('hex');
        const newFileName = `disease/${randomString}-${id_patient}.jpg`;

        //Upload gambar ke GCS
        const newImageUrl = await uploadToGCS(img_disease.buffer, newFileName);

        //Format SQL dengan zona waktu
        const diagnosisDate = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'); 

        //Checking apakah sudah ada diagnosis sebelumnya
        const [existingDiagnosis] = await pool.query(
            'SELECT Img_disease FROM Diagnose WHERE Id_patient = ?',
            [id_patient]
        );

        if (existingDiagnosis.length > 0) {
            const oldImageUrl = existingDiagnosis[0].Img_disease;
            const oldFileName = oldImageUrl.split('/').pop();
            if (oldFileName !== newFileName) {
                await deleteFromGCS(`disease/${oldFileName}`); // Hapus file lama
            }

            // Update diagnosis
            await pool.query(
                `UPDATE Diagnose
                 SET Img_disease = ?, Disease_name = ?, Description = ?, Diagnosis_date = ?, Model_version = ?
                 WHERE Id_patient = ?`,
                [newImageUrl, disease_name, description, diagnosisDate, model_version, id_patient]
            );
        } else {
            // Tambah diagnosis baru
            await pool.query(
                `INSERT INTO Diagnose (Id_patient, Img_disease, Disease_name, Description, Diagnosis_date, Model_version)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id_patient, newImageUrl, disease_name, description, diagnosisDate, model_version]
            );
        }

        return h.response({
            message: 'Diagnosis successful',
            imageUrl: newImageUrl,
            disease_name,
            confidence: (confidence * 100).toFixed(2),
            description,
        }).code(201);
    } catch (error) {
        console.error('Error during prediction:', error.message);
        return h.response({ message: 'Failed to process diagnosis.', error: error.message }).code(500);
    }
};

// Fungsi untuk mendapatkan daftar Coass
const listCoass = async (request, h) => {
    const patient_id = request.auth.credentials.id; // Mengambil patient_id dari request.auth.credentials

    try {
        // Mengecek status di tabel Requests.
        const [statusRows] = await pool.query(
            `SELECT Status FROM Requests WHERE Patient_id = ?`,
            [patient_id]
        );

        if (statusRows.length > 0) {
            const status = statusRows[0].Status;

            if (status === 'Pending') {
                return h.response({ message: 'Pengajuan anda sedang diproses.' }).code(200);
            } else if (status === 'Accepted') {
                return h.response({ message: 'Pengajuan anda telah disetujui.' }).code(200);
            } else {
                // Jika status "Rejected" atau lainnya, tampilkan daftar Coass.
                const [coassRows] = await pool.query(`
                    SELECT Id, Name, Gender, University, Appointment_Place, Phone, Img_profile 
                    FROM Users WHERE Role = 'Coass'
                `);
                return h.response(coassRows).code(200);
            }
        } else {
            // Jika tidak ada entri di tabel Requests, tampilkan daftar Coass.
            const [coassRows] = await pool.query(`
                SELECT Id, Name, Gender, University, Appointment_Place, Phone, Img_profile 
                FROM Users WHERE Role = 'Coass'
            `);
            return h.response(coassRows).code(200);
        }
    } catch (error) {
        console.error('Error fetching Coass list:', error.message);
        return h.response({ message: 'Internal Server Error' }).code(500);
    }
};


// Fungsi untuk mendapatkan daftar pasien
const listPatients = async (request, h) => {
    const query = `
        SELECT Users.Id, Users.Name, Users.Gender, Users.Birth_date, Users.City, 
        Users.Phone, Users.Img_profile, Users.Check, Diagnose.Disease_name, Diagnose.Img_disease, 
        Diagnose.Description, Diagnose.Diagnosis_date, Diagnose.Model_version 
        FROM Users JOIN Diagnose ON Users.Id = Diagnose.Id_patient 
        WHERE Users.Role = 'Patient' AND Users.Check = 'No'`;

    try {
        const [rows] = await pool.query(query);
        return h.response(rows).code(200);
    } catch (error) {
        console.error('Error fetching patient list:', error.message);
        return h.response({ message: 'Internal Server Error' }).code(500);
    }
};

module.exports = { getPredict, predictDisease, listCoass, listPatients };
