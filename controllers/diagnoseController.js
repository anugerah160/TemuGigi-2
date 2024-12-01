const pool = require('../utils/database');
const cloudStorageService = require('../services/cloudStorageService');

const predictDisease = async (request, h) => {
    const { id_patient, img_disease } = request.payload;

    // Upload the image to Google Cloud Storage
    const filePath = `/tmp/${img_disease.filename}`;
    const destination = `diagnoses/${img_disease.filename}`;
    const imageUrl = await cloudStorageService.uploadFile(filePath, destination);

    // Simulate disease prediction
    const disease_name = 'Sample Disease';
    const description = 'This is a simulated diagnosis result';

    const query = `
        INSERT INTO Diagnose (Id_patient, Img_disease, Disease_name, Description)
        VALUES (?, ?, ?, ?)`;

    await pool.query(query, [id_patient, imageUrl, disease_name, description]);
    return h.response({ message: 'Diagnosis successful', imageUrl }).code(201);
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
