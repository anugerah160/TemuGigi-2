const { uploadToGCS, deleteFromGCS } = require('../services/gcsService');
const pool = require('../utils/database');

const predictDisease = async (request, h) => {
    const id_patient = request.auth.credentials.id; // Extract Id_patient from JWT
    const img_disease = request.file; // File uploaded

    if (!img_disease) {
        return h.response({ message: 'Image file is required.' }).code(400);
    }

    try {
        // Define new filename as Id_patient
        const newFileName = `${id_patient}.jpg`;

        // Upload new image to GCS
        const newImageUrl = await uploadToGCS(img_disease.buffer, `disease/${newFileName}`);

        // Simulated ML model result
        const disease_name = 'Sample Disease';
        const description = 'This is a simulated diagnosis result';
        const model_version = 'v1.0';

        // Check if a previous diagnosis exists for the patient
        const [existingDiagnosis] = await pool.query(
            'SELECT Img_disease FROM Diagnose WHERE Id_patient = ?',
            [id_patient]
        );

        if (existingDiagnosis.length > 0) {
            const oldImageUrl = existingDiagnosis[0].Img_disease;
            const oldFileName = oldImageUrl.split('/').pop(); // Extract file name from URL
            if (oldFileName !== newFileName) {
                await deleteFromGCS(`disease/${oldFileName}`); // Delete the old image from GCS
            }

            // Update diagnosis record in the database
            await pool.query(
                `UPDATE Diagnose SET Img_disease = ?, Disease_name = ?, Description = ?, Diagnosis_date = NOW(), Model_version = ? WHERE Id_patient = ?`,
                [newImageUrl, disease_name, description, model_version, id_patient]
            );
        } else {
            // Insert new diagnosis record
            await pool.query(
                `INSERT INTO Diagnose (Id_patient, Img_disease, Disease_name, Description, Diagnosis_date, Model_version) VALUES (?, ?, ?, ?, NOW(), ?)`,
                [id_patient, newImageUrl, disease_name, description, model_version]
            );
        }

        return h.response({
            message: 'Diagnosis successful',
            imageUrl: newImageUrl,
        }).code(201);
    } catch (error) {
        console.error('Error during prediction:', error);
        return h.response({ message: 'Failed to process diagnosis.', error: error.message }).code(500);
    }
};

const listCoass = async (request, h) => {
    const query = `
        SELECT Id, Name, Gender, University, Appointment_Place, Phone, Img_profile 
        FROM Users WHERE Role = 'Coass'`;

    const [rows] = await pool.query(query);
    return h.response(rows).code(200);
};

const listPatients = async (request, h) => {
    const query = `
                SELECT Users.Id, Users.Name, Users.Gender, Users.Birth_date, Users.City, 
                Users.Phone, Users.Img_profile, Users.Check, Diagnose.Disease_name, Diagnose.Img_disease, 
                Diagnose.Description, Diagnose.Diagnosis_date, Diagnose.Model_version 
                FROM Users JOIN Diagnose ON Users.Id = Diagnose.Id_patient WHERE 
                Users.Role = 'Patient' && Users.Check = 'No'
                `;
    // const query = `
    //     SELECT Id, Name, Gender, Birth_date, City, Phone, Img_profile 
    //     FROM Users WHERE Role = 'Patient'
    //     `;

    const [rows] = await pool.query(query);
    return h.response(rows).code(200);
};

module.exports = { predictDisease, listCoass, listPatients };
